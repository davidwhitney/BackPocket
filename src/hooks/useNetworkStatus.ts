import { useState, useEffect, useCallback } from "react";
import { getPendingCount, processQueue } from "../services/offline-queue.ts";
import { fetchPendingSnapshots } from "../services/storage.ts";

export interface NetworkStatus {
  online: boolean;
  pendingCount: number;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    pendingCount: 0,
  });

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setStatus((prev) => ({ ...prev, pendingCount: count }));
  }, []);

  useEffect(() => {
    const goOnline = async () => {
      setStatus((prev) => ({ ...prev, online: true }));
      // Process the offline queue now that we're back online
      const processed = await processQueue();
      if (processed > 0) {
        // Re-attempt snapshot fetches for items that were queued
        await fetchPendingSnapshots();
      }
      await refreshPending();
    };

    const goOffline = () => {
      setStatus((prev) => ({ ...prev, online: false }));
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Listen for service worker messages about completed syncs
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", async (event) => {
        if (event.data?.type === "SNAPSHOTS_SYNCED") {
          await fetchPendingSnapshots();
          await refreshPending();
        }
      });
    }

    // Initial pending count
    refreshPending();

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refreshPending]);

  return status;
}
