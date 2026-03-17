import { Bookmark, BookmarkIndex, PageSnapshot } from "../types/index";
import { getPlatformServices } from "./platform";

function storage() { return getPlatformServices().storage; }

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

/**
 * Merge remote data into local storage, respecting deletions and modifications.
 * - Remote bookmarks are added or updated (newer dateModified wins)
 * - Bookmarks that exist locally but not in remote are deleted (remote deletion)
 * - Local-only bookmarks that are newer than lastSync are kept (offline additions)
 */
export async function mergeRemoteData(
  json: string,
  lastSync?: string,
): Promise<{ added: number; updated: number; deleted: number }> {
  const data = JSON.parse(json);

  if (!data?.index?.bookmarks || !Array.isArray(data.index.bookmarks)) {
    throw new Error("Invalid backup file: missing bookmarks array");
  }

  const remoteBookmarks: Bookmark[] = data.index.bookmarks;
  const remoteSnapshots: PageSnapshot[] = Array.isArray(data.snapshots) ? data.snapshots : [];
  const localIndex = await storage().loadIndex();

  const remoteById = new Map(remoteBookmarks.map((b) => [b.id, b]));
  const syncCutoff = lastSync ? new Date(lastSync).getTime() : 0;

  let added = 0;
  let updated = 0;
  let deleted = 0;

  for (const remote of remoteBookmarks) {
    const local = localIndex.bookmarks.find((b) => b.id === remote.id);
    if (!local) {
      await storage().saveBookmark(remote);
      added++;
    } else {
      const remoteTime = new Date(remote.dateModified).getTime();
      const localTime = new Date(local.dateModified).getTime();
      if (remoteTime > localTime) {
        await storage().saveBookmark(remote);
        updated++;
      }
    }
  }

  for (const local of localIndex.bookmarks) {
    if (!remoteById.has(local.id)) {
      const addedTime = new Date(local.dateAdded).getTime();
      if (addedTime < syncCutoff) {
        await storage().deleteBookmark(local.id);
        deleted++;
      }
    }
  }

  for (const snap of remoteSnapshots) {
    await storage().saveSnapshot(snap);
  }

  return { added, updated, deleted };
}
