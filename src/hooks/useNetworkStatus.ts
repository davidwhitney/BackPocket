import { useState, useEffect, useCallback } from "react";
import { getPendingCount, processQueue } from "../services/offline-queue";
import { fetchPendingSnapshots } from "../services/storage";
import { SW_MESSAGES } from "../constants";

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
      const processed = await processQueue();
      if (processed > 0) {
        await fetchPendingSnapshots();
      }
      await refreshPending();
    };

    const goOffline = () => {
      setStatus((prev) => ({ ...prev, online: false }));
    };

    const onSwMessage = async (event: MessageEvent) => {
      if (event.data?.type === SW_MESSAGES.SNAPSHOTS_SYNCED) {
        await fetchPendingSnapshots();
        await refreshPending();
      }
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
    }

    refreshPending();

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSwMessage);
      }
    };
  }, [refreshPending]);

  return status;
}
