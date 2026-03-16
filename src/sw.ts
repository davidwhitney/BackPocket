/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

// Take control immediately on install — don't wait for existing tabs to close
self.skipWaiting();
clientsClaim();

// Precache the app shell (injected by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Serve the app shell for all navigation requests (SPA fallback)
const navigationHandler = new NetworkFirst({
  cacheName: "pages-cache",
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
  ],
});
registerRoute(new NavigationRoute(navigationHandler));

// Cache static assets (JS, CSS, fonts) with cache-first
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

// Cache images with stale-while-revalidate
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

// Cache /api/fetch-page proxy responses so snapshots work offline
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname === "/api/fetch-page",
  new NetworkFirst({
    cacheName: "snapshot-fetches",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 90 * 24 * 60 * 60 }),
    ],
    networkTimeoutSeconds: 15,
  }),
);

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync: process queued snapshot fetches when connectivity returns
self.addEventListener("sync", (event: any) => {
  if (event.tag === "snapshot-queue") {
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
        // Cache the proxy response so the main thread can read it
        const cache = await caches.open("snapshot-fetches");
        await cache.put(proxyUrl, response.clone());
      }
      // Remove from queue on success
      const deleteTx = db.transaction("pending", "readwrite");
      deleteTx.objectStore("pending").delete(item.id);
      await idbTxDone(deleteTx);
    } catch {
      // Still offline or failed, leave in queue for next sync
    }
  }

  db.close();

  // Notify the main thread that snapshots may have been fetched
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: "SNAPSHOTS_SYNCED" });
  }
}

// Minimal IndexedDB helpers for use inside the service worker
function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("backpocket_queue", 1);
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
