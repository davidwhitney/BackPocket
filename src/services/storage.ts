import { openDB, IDBPDatabase } from "idb";
import { Bookmark, BookmarkIndex, PageSnapshot } from "../types/index.ts";
import { generateId } from "../utils/id.ts";
import { DB_NAME, DB_VERSION } from "../constants.ts";
import { enqueueSnapshotFetch, getAllPending, dequeueItem } from "./offline-queue.ts";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("index")) {
          db.createObjectStore("index", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("snapshots")) {
          db.createObjectStore("snapshots", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// --- Index operations ---

export async function loadIndex(): Promise<BookmarkIndex> {
  const db = await getDb();
  const bookmarks = await db.getAll("index");
  return { version: 1, bookmarks: bookmarks as Bookmark[] };
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const db = await getDb();
  await db.put("index", bookmark);
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("index", id);
  await db.delete("snapshots", id);
}

export async function getBookmark(id: string): Promise<Bookmark | undefined> {
  const db = await getDb();
  return db.get("index", id);
}

// --- Snapshot operations ---

export async function saveSnapshot(snapshot: PageSnapshot): Promise<void> {
  const db = await getDb();
  await db.put("snapshots", snapshot);
}

export async function getSnapshot(id: string): Promise<PageSnapshot | undefined> {
  const db = await getDb();
  return db.get("snapshots", id);
}

export async function getAllSnapshots(): Promise<PageSnapshot[]> {
  const db = await getDb();
  return db.getAll("snapshots");
}

// --- Page fetching ---

interface FetchPageResult {
  title: string;
  description: string;
  content: string;
  textContent: string;
}

async function fetchPage(url: string, signal?: AbortSignal): Promise<FetchPageResult | null> {
  try {
    const response = await fetch(
      `/api/fetch-page?url=${encodeURIComponent(url)}`,
      signal ? { signal } : undefined,
    );
    if (!response.ok) return null;
    const data = await response.json();
    // Server extracts article content and metadata
    return {
      title: data.title || "",
      description: data.description || "",
      content: data.content || "",
      textContent: data.textContent || "",
    };
  } catch {
    return null;
  }
}

async function saveSnapshotForBookmark(bookmarkId: string, page: FetchPageResult): Promise<void> {
  await saveSnapshot({
    id: bookmarkId,
    content: page.content,
    textContent: page.textContent,
    fetchedAt: new Date().toISOString(),
  });

  const bookmark = await getBookmark(bookmarkId);
  if (bookmark) {
    bookmark.snapshotAvailable = true;
    bookmark.dateModified = new Date().toISOString();
    if (page.title && bookmark.title === bookmark.url) {
      bookmark.title = page.title;
    }
    if (page.description && !bookmark.description) {
      bookmark.description = page.description;
    }
    await saveBookmark(bookmark);
  }
}

// --- Public API ---

export async function fetchPageMetadata(
  url: string,
  signal?: AbortSignal,
): Promise<{ title: string; description: string } | null> {
  if (!navigator.onLine) return null;

  const page = await fetchPage(url, signal);
  if (!page) return null;
  if (!page.title && !page.description) return null;
  return { title: page.title, description: page.description };
}

export async function addBookmark(
  url: string,
  title?: string,
  description?: string,
): Promise<Bookmark> {
  const id = generateId();
  const now = new Date().toISOString();

  const bookmark: Bookmark = {
    id,
    url,
    title: title || url,
    description: description || "",
    tags: [],
    status: "unread",
    dateAdded: now,
    dateModified: now,
    snapshotAvailable: false,
  };

  await saveBookmark(bookmark);
  fetchAndStoreSnapshot(id, url).catch(console.error);

  return bookmark;
}

export async function fetchAndStoreSnapshot(id: string, url: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueSnapshotFetch(id, url);
    return;
  }

  const page = await fetchPage(url);
  if (!page) {
    await enqueueSnapshotFetch(id, url);
    return;
  }

  await saveSnapshotForBookmark(id, page);
}

export async function fetchPendingSnapshots(): Promise<void> {
  const pending = await getAllPending();

  for (const item of pending) {
    const page = await fetchPage(item.url);
    if (!page) continue;

    await saveSnapshotForBookmark(item.bookmarkId, page);
    await dequeueItem(item.id);
  }
}

// --- Search ---

export async function searchBookmarks(
  query: string,
  deepSearch: boolean = false,
): Promise<Bookmark[]> {
  const index = await loadIndex();
  const q = query.toLowerCase();

  const results = index.bookmarks.filter((b) =>
    b.title.toLowerCase().includes(q) ||
    b.description.toLowerCase().includes(q) ||
    b.url.toLowerCase().includes(q) ||
    b.tags.some((t) => t.toLowerCase().includes(q)),
  );

  if (!deepSearch) return results;

  const allBookmarkIds = new Set(results.map((b) => b.id));
  const snapshots = await getAllSnapshots();

  for (const snap of snapshots) {
    if (allBookmarkIds.has(snap.id)) continue;
    if (snap.textContent.toLowerCase().includes(q)) {
      const bookmark = index.bookmarks.find((b) => b.id === snap.id);
      if (bookmark) {
        results.push(bookmark);
        allBookmarkIds.add(snap.id);
      }
    }
  }

  return results;
}

// --- Export ---

export async function exportAllData(): Promise<string> {
  const index = await loadIndex();
  const snapshots = await getAllSnapshots();
  return JSON.stringify({ index, snapshots }, null, 2);
}

export async function importAllData(json: string): Promise<{ bookmarks: number; snapshots: number }> {
  const data = JSON.parse(json);

  if (!data?.index?.bookmarks || !Array.isArray(data.index.bookmarks)) {
    throw new Error("Invalid backup file: missing bookmarks array");
  }

  const bookmarks: Bookmark[] = data.index.bookmarks;
  const snapshots: PageSnapshot[] = Array.isArray(data.snapshots) ? data.snapshots : [];

  const db = await getDb();

  const tx = db.transaction(["index", "snapshots"], "readwrite");
  const indexStore = tx.objectStore("index");
  const snapshotStore = tx.objectStore("snapshots");

  for (const bookmark of bookmarks) {
    await indexStore.put(bookmark);
  }
  for (const snapshot of snapshots) {
    await snapshotStore.put(snapshot);
  }

  await tx.done;

  return { bookmarks: bookmarks.length, snapshots: snapshots.length };
}
