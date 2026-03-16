import { useRef, useCallback, useEffect } from "react";
import { AppConfig } from "../types/index.ts";
import { loadIndex, exportAllData } from "../services/storage.ts";
import { syncToOneDrive } from "../services/onedrive.ts";
import { writeIndexToFolder, restoreHandle, getDirHandle } from "../services/folder-sync.ts";
import { useDebounce } from "./useDebounce.ts";
import { SYNC_DEBOUNCE_MS } from "../constants.ts";

interface UseSyncOptions {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
}

export function useSync({ config, setConfig }: UseSyncOptions) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (config.storageProvider === "folder") {
      restoreHandle().catch(() => {});
    }
  }, [config.storageProvider]);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    if (!navigator.onLine && config.storageProvider !== "folder") return;

    syncingRef.current = true;

    try {
      switch (config.storageProvider) {
        case "folder": {
          if (!getDirHandle()) await restoreHandle();
          if (!getDirHandle()) break;
          const index = await loadIndex();
          const ok = await writeIndexToFolder(index);
          if (ok) setConfig({ lastSync: new Date().toISOString() });
          break;
        }
        case "onedrive": {
          if (!config.onedrive?.accessToken) break;
          const result = await syncToOneDrive(config, setConfig, exportAllData);
          if (!result.success) console.warn("OneDrive sync failed:", result.error);
          break;
        }
      }
    } catch (err) {
      console.warn("Sync failed:", err);
    } finally {
      syncingRef.current = false;
    }
  }, [config, setConfig]);

  const debouncedSync = useDebounce(syncNow, SYNC_DEBOUNCE_MS);

  const scheduleSync = useCallback(() => {
    if (config.storageProvider === "local") return;
    debouncedSync();
  }, [config.storageProvider, debouncedSync]);

  useEffect(() => {
    if (config.storageProvider === "local") return;
    const handler = () => scheduleSync();
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [config.storageProvider, scheduleSync]);

  return { scheduleSync, syncNow };
}
