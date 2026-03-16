import type { Bookmark, BookmarkIndex, PageSnapshot } from "../../types/index.ts";

export interface StorageEngine {
  // Bookmarks
  loadIndex(): Promise<BookmarkIndex>;
  getBookmark(id: string): Promise<Bookmark | undefined>;
  saveBookmark(bookmark: Bookmark): Promise<void>;
  deleteBookmark(id: string): Promise<void>;

  // Snapshots
  getSnapshot(id: string): Promise<PageSnapshot | undefined>;
  saveSnapshot(snapshot: PageSnapshot): Promise<void>;
  getAllSnapshots(): Promise<PageSnapshot[]>;

  // Bulk
  importAll(bookmarks: Bookmark[], snapshots: PageSnapshot[]): Promise<void>;
}
