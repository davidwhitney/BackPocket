import { openDB } from "idb";
import { QUEUE_DB_NAME, QUEUE_DB_VERSION, SYNC_TAG_SNAPSHOT_QUEUE } from "../constants";

interface PendingItem {
  id: string;
  bookmarkId: string;
  url: string;
  createdAt: string;
}

function getQueueDb() {
  return openDB(QUEUE_DB_NAME, QUEUE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "id" });
      }
    },
  });
}

export async function enqueueSnapshotFetch(bookmarkId: string, url: string): Promise<void> {
  const db = await getQueueDb();
  const item: PendingItem = {
    id: bookmarkId,
    bookmarkId,
    url,
    createdAt: new Date().toISOString(),
  };
  await db.put("pending", item);

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    try {
      await (reg as any).sync.register(SYNC_TAG_SNAPSHOT_QUEUE);
    } catch {
      // Background sync not supported or denied
    }
  }
}

export async function dequeueItem(bookmarkId: string): Promise<void> {
  const db = await getQueueDb();
  await db.delete("pending", bookmarkId);
}

export async function getPendingCount(): Promise<number> {
  const db = await getQueueDb();
  return db.count("pending");
}

export async function getAllPending(): Promise<PendingItem[]> {
  const db = await getQueueDb();
  return db.getAll("pending");
}

export async function processQueue(): Promise<number> {
  const items = await getAllPending();
  let processed = 0;

  for (const item of items) {
    try {
      const response = await fetch(item.url, { mode: "no-cors" });
      if (response) {
        processed++;
        await dequeueItem(item.id);
      }
    } catch {
      // Still offline for this URL, leave in queue
    }
  }

  return processed;
}
