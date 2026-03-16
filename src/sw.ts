/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";

// Note: constants are inlined here because the SW bundle is separate from the
// main app bundle and can't share the idb library or main-thread modules.
// These values must stay in sync with src/constants.ts.
const QUEUE_DB_NAME = "backpocket_queue";
const CACHE_SNAPSHOTS = "snapshot-fetches";
const SYNC_TAG = "snapshot-queue";
const MSG_SNAPSHOTS_SYNCED = "SNAPSHOTS_SYNCED";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigation fallback
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "pages-cache",
      plugins: [new CacheableResponsePlugin({ statuses: [200] })],
    }),
  ),
);

// Static assets — cache-first
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

// Images — stale-while-revalidate
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
);

// Proxy page fetches — cache for offline snapshot access
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname === "/api/fetch-page",
  new NetworkFirst({
    cacheName: CACHE_SNAPSHOTS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 90 * 24 * 60 * 60 }),
    ],
    networkTimeoutSeconds: 15,
  }),
);

// Messages from main thread
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync — process queued snapshot fetches on reconnect
self.addEventListener("sync", (event: any) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSnapshotQueue());
  }
});

async function processSnapshotQueue(): Promise<void> {
  const db = await openQueue();
  const tx = db.transaction("pending", "readwrite");
  const store = tx.objectStore("pending");
  const items = await idbGetAll(store);

  for (const item of items) {
    try {
      const proxyUrl = `${self.location.origin}/api/fetch-page?url=${encodeURIComponent(item.url)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const cache = await caches.open(CACHE_SNAPSHOTS);
        await cache.put(proxyUrl, response.clone());
      }
      const deleteTx = db.transaction("pending", "readwrite");
      deleteTx.objectStore("pending").delete(item.id);
      await idbTxDone(deleteTx);
    } catch {
      // Still offline, leave in queue
    }
  }

  db.close();

  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: MSG_SNAPSHOTS_SYNCED });
  }
}

// Minimal IndexedDB helpers — can't use the `idb` npm package in the SW context
function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(store: IDBObjectStore): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbTxDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
