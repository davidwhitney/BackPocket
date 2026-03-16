import { openDB, IDBPDatabase } from "idb";
import type { Bookmark, BookmarkIndex, PageSnapshot } from "../../types/index";
import type { StorageEngine } from "./StorageEngine";
import { DB_NAME, DB_VERSION } from "../../constants";

export class IdbStorageEngine implements StorageEngine {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private getDb(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
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
    return this.dbPromise;
  }

  async loadIndex(): Promise<BookmarkIndex> {
    const db = await this.getDb();
    const bookmarks = await db.getAll("index");
    return { version: 1, bookmarks: bookmarks as Bookmark[] };
  }

  async getBookmark(id: string): Promise<Bookmark | undefined> {
    const db = await this.getDb();
    return db.get("index", id);
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    const db = await this.getDb();
    await db.put("index", bookmark);
  }

  async deleteBookmark(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete("index", id);
    await db.delete("snapshots", id);
  }

  async getSnapshot(id: string): Promise<PageSnapshot | undefined> {
    const db = await this.getDb();
    return db.get("snapshots", id);
  }

  async saveSnapshot(snapshot: PageSnapshot): Promise<void> {
    const db = await this.getDb();
    await db.put("snapshots", snapshot);
  }

  async getAllSnapshots(): Promise<PageSnapshot[]> {
    const db = await this.getDb();
    return db.getAll("snapshots");
  }

  async importAll(bookmarks: Bookmark[], snapshots: PageSnapshot[]): Promise<void> {
    const db = await this.getDb();
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
  }
}
