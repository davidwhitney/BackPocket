import { Bookmark, BookmarkIndex, PageSnapshot } from "../types/index";
import { generateId } from "../utils/id";
import { getPlatformServices } from "./platform";
import { enqueueSnapshotFetch, getAllPending, dequeueItem } from "./offline-queue";
import { getExternalProvider } from "./sync/registry";
import { loadConfig } from "./config";
import type { FetchPageResult } from "./strategies/PageFetchStrategy";

// --- Delegating accessors (keep the public API unchanged) ---

function storage() { return getPlatformServices().storage; }
function fetcher() { return getPlatformServices().pageFetch; }

function getActiveProvider() {
  const cfg = loadConfig();
  return getExternalProvider(cfg.storageProvider);
}

export function loadIndex(): Promise<BookmarkIndex> {
  return storage().loadIndex();
}

export function saveBookmark(bookmark: Bookmark): Promise<void> {
  return storage().saveBookmark(bookmark);
}

export async function deleteBookmark(id: string): Promise<void> {
  await storage().deleteBookmark(id);
  const provider = getActiveProvider();
  if (provider) {
    provider.deleteSnapshot(id, loadConfig()).catch(console.warn);
  }
}

export function getBookmark(id: string): Promise<Bookmark | undefined> {
  return storage().getBookmark(id);
}

export function getSnapshot(id: string): Promise<PageSnapshot | undefined> {
  return storage().getSnapshot(id);
}

export function getAllSnapshots(): Promise<PageSnapshot[]> {
  return storage().getAllSnapshots();
}

// --- Snapshot helpers ---

async function saveSnapshotForBookmark(bookmarkId: string, page: FetchPageResult): Promise<void> {
  const snapshot: PageSnapshot = {
    id: bookmarkId,
    content: page.content,
    textContent: page.textContent,
    fetchedAt: new Date().toISOString(),
  };

  await storage().saveSnapshot(snapshot);

  // Sync individual snapshot to external provider if active
  const provider = getActiveProvider();
  if (provider) {
    provider.pushSnapshot(snapshot, loadConfig()).catch(console.warn);
  }

  const bookmark = await storage().getBookmark(bookmarkId);
  if (bookmark) {
    bookmark.snapshotAvailable = true;
    bookmark.dateModified = new Date().toISOString();
    if (page.title && bookmark.title === bookmark.url) {
      bookmark.title = page.title;
    }
    if (page.description && !bookmark.description) {
      bookmark.description = page.description;
    }
    await storage().saveBookmark(bookmark);
  }
}

// --- Public API ---

export async function fetchPageMetadata(
  url: string,
  signal?: AbortSignal,
): Promise<{ title: string; description: string } | null> {
  if (!navigator.onLine) return null;

  const page = await fetcher().fetchPage(url, signal);
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

  await storage().saveBookmark(bookmark);
  fetchAndStoreSnapshot(id, url).catch(console.error);

  return bookmark;
}

export async function fetchAndStoreSnapshot(id: string, url: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueSnapshotFetch(id, url);
    return;
  }

  const page = await fetcher().fetchPage(url);
  if (!page) {
    await enqueueSnapshotFetch(id, url);
    return;
  }

  await saveSnapshotForBookmark(id, page);
}

export async function fetchPendingSnapshots(): Promise<void> {
  const pending = await getAllPending();

  for (const item of pending) {
    const page = await fetcher().fetchPage(item.url);
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
  const index = await storage().loadIndex();
  const q = query.toLowerCase();

  const results = index.bookmarks.filter((b) =>
    b.title.toLowerCase().includes(q) ||
    b.description.toLowerCase().includes(q) ||
    b.url.toLowerCase().includes(q) ||
    b.tags.some((t) => t.toLowerCase().includes(q)),
  );

  if (!deepSearch) return results;

  const allBookmarkIds = new Set(results.map((b) => b.id));
  const snapshots = await storage().getAllSnapshots();

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

// --- Export / Import ---

export async function exportAllData(): Promise<string> {
  const index = await storage().loadIndex();
  const snapshots = await storage().getAllSnapshots();
  return JSON.stringify({ index, snapshots }, null, 2);
}

export async function importAllData(json: string): Promise<{ bookmarks: number; snapshots: number }> {
  const data = JSON.parse(json);

  if (!data?.index?.bookmarks || !Array.isArray(data.index.bookmarks)) {
    throw new Error("Invalid backup file: missing bookmarks array");
  }

  const bookmarks: Bookmark[] = data.index.bookmarks;
  const snapshots: PageSnapshot[] = Array.isArray(data.snapshots) ? data.snapshots : [];

  await storage().importAll(bookmarks, snapshots);

  return { bookmarks: bookmarks.length, snapshots: snapshots.length };
}
