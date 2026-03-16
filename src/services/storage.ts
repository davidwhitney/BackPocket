import { openDB, IDBPDatabase } from "idb";
import { Bookmark, BookmarkIndex, PageSnapshot } from "../types/index.ts";
import { generateId } from "../utils/id.ts";
import { enqueueSnapshotFetch, getAllPending, dequeueItem } from "./offline-queue.ts";

const DB_NAME = "backpocket";
const DB_VERSION = 1;

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

export async function getSnapshot(
  id: string,
): Promise<PageSnapshot | undefined> {
  const db = await getDb();
  return db.get("snapshots", id);
}

export async function getAllSnapshots(): Promise<PageSnapshot[]> {
  const db = await getDb();
  return db.getAll("snapshots");
}

// --- Metadata extraction ---

export interface PageMetadata {
  title: string;
  description: string;
  html: string;
  textContent: string;
}

function extractMetadata(html: string): PageMetadata {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("title")?.textContent?.trim() || "";
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() ||
    "";
  const textContent = doc.body?.textContent || "";
  return { title, description, html, textContent };
}

async function fetchPageHtml(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/fetch-page?url=${encodeURIComponent(url)}`,
      signal ? { signal } : undefined,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.html || null;
  } catch {
    return null;
  }
}

/**
 * Fetch page metadata (title + description) for a URL.
 * Used by the Add Bookmark page to preview metadata before saving.
 * Returns null if the page can't be fetched (CORS, offline, etc).
 */
export async function fetchPageMetadata(
  url: string,
  signal?: AbortSignal,
): Promise<{ title: string; description: string } | null> {
  if (!navigator.onLine) return null;

  const html = await fetchPageHtml(url, signal);
  if (!html) return null;

  const meta = extractMetadata(html);
  if (!meta.title && !meta.description) return null;
  return { title: meta.title, description: meta.description };
}

// --- High-level operations ---

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

  // Fetch snapshot - queues for later if offline
  fetchAndStoreSnapshot(id, url).catch(console.error);

  return bookmark;
}

export async function fetchAndStoreSnapshot(
  id: string,
  url: string,
): Promise<void> {
  if (!navigator.onLine) {
    await enqueueSnapshotFetch(id, url);
    return;
  }

  const html = await fetchPageHtml(url);
  if (!html) {
    await enqueueSnapshotFetch(id, url);
    return;
  }

  const meta = extractMetadata(html);

  const snapshot: PageSnapshot = {
    id,
    html: meta.html,
    textContent: meta.textContent,
    fetchedAt: new Date().toISOString(),
  };

  await saveSnapshot(snapshot);

  const bookmark = await getBookmark(id);
  if (bookmark) {
    bookmark.snapshotAvailable = true;
    bookmark.dateModified = new Date().toISOString();
    if (meta.title && bookmark.title === bookmark.url) {
      bookmark.title = meta.title;
    }
    if (meta.description && !bookmark.description) {
      bookmark.description = meta.description;
    }
    await saveBookmark(bookmark);
  }
}

/**
 * Process any pending snapshot fetches from the offline queue.
 * Called when we come back online or when the service worker signals sync completion.
 */
export async function fetchPendingSnapshots(): Promise<void> {
  const pending = await getAllPending();

  for (const item of pending) {
    const html = await fetchPageHtml(item.url);
    if (!html) continue;

    const meta = extractMetadata(html);

    const snapshot: PageSnapshot = {
      id: item.bookmarkId,
      html: meta.html,
      textContent: meta.textContent,
      fetchedAt: new Date().toISOString(),
    };

    await saveSnapshot(snapshot);

    const bookmark = await getBookmark(item.bookmarkId);
    if (bookmark) {
      bookmark.snapshotAvailable = true;
      bookmark.dateModified = new Date().toISOString();
      if (meta.title && bookmark.title === bookmark.url) {
        bookmark.title = meta.title;
      }
      if (meta.description && !bookmark.description) {
        bookmark.description = meta.description;
      }
      await saveBookmark(bookmark);
    }

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

  const results = index.bookmarks.filter((b) => {
    const basic =
      b.title.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      b.tags.some((t) => t.toLowerCase().includes(q));
    return basic;
  });

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
