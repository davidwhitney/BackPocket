import { useRef, useCallback, useEffect } from "react";
import { AppConfig } from "../types/index";
import { loadIndex } from "../services/storage";
import { mergeRemoteData } from "../services/import-export";
import { getExternalProvider } from "../services/sync/registry";
import { setOneDriveConfigSetter } from "../services/sync/OneDriveStorageProvider";
import { useDebounce } from "./useDebounce";
import { SYNC_DEBOUNCE_MS } from "../constants";

interface UseSyncOptions {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
  onDataPulled?: () => void;
}

export function useSync({ config, setConfig, onDataPulled }: UseSyncOptions) {
  const syncingRef = useRef(false);
  const initialPullDoneRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;
  const setConfigRef = useRef(setConfig);
  setConfigRef.current = setConfig;
  const onDataPulledRef = useRef(onDataPulled);
  onDataPulledRef.current = onDataPulled;

  useEffect(() => {
    setOneDriveConfigSetter(setConfig);
  }, [setConfig]);

  useEffect(() => {
    const provider = getExternalProvider(config.storageProvider);
    provider?.init(config);
  }, [config.storageProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const pullRemote = useCallback(async (): Promise<boolean> => {
    const cfg = configRef.current;
    const provider = getExternalProvider(cfg.storageProvider);
    if (!provider) return false;
    if (provider.requiresOnline && !navigator.onLine) return false;

    if (!provider.isReady(cfg)) {
      await provider.init(cfg);
      if (!provider.isReady(cfg)) return false;
    }

    const changed = await provider.hasRemoteChanges(cfg);
    if (!changed) return false;

    try {
      const result = await provider.pull(cfg);
      if (result.success && result.data) {
        const merged = await mergeRemoteData(result.data, cfg.lastSync);
        onDataPulledRef.current?.();
        return merged.added > 0 || merged.updated > 0 || merged.deleted > 0;
      }
    } catch (err) {
      console.warn("Pull failed:", err);
    }
    return false;
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    // Don't push until the initial pull has completed
    if (!initialPullDoneRef.current) return;

    const cfg = configRef.current;
    const provider = getExternalProvider(cfg.storageProvider);
    if (!provider) return;
    if (provider.requiresOnline && !navigator.onLine) return;

    if (!provider.isReady(cfg)) {
      await provider.init(cfg);
      if (!provider.isReady(cfg)) return;
    }

    syncingRef.current = true;

    try {
      const index = await loadIndex();
      const result = await provider.pushIndex(index, cfg);
      if (result.success) {
        setConfigRef.current({ lastSync: new Date().toISOString() });
      } else {
        console.warn("Sync failed:", result.error);
      }
    } catch (err) {
      console.warn("Sync failed:", err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const debouncedSync = useDebounce(syncNow, SYNC_DEBOUNCE_MS);

  const scheduleSync = useCallback(() => {
    const provider = getExternalProvider(configRef.current.storageProvider);
    if (!provider) return;
    debouncedSync();
  }, [debouncedSync]);

  // Sync when coming back online
  useEffect(() => {
    const provider = getExternalProvider(config.storageProvider);
    if (!provider) return;
    const handler = async () => {
      const pulled = await pullRemote();
      if (!pulled) scheduleSync();
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [config.storageProvider, scheduleSync, pullRemote]);

  // On startup: pull remote first, then allow pushes
  useEffect(() => {
    const provider = getExternalProvider(config.storageProvider);
    if (!provider) return;
    const timer = setTimeout(async () => {
      await pullRemote();
      initialPullDoneRef.current = true;
      // Only push if local has data that remote might not have
      const index = await loadIndex();
      if (index.bookmarks.length > 0) {
        scheduleSync();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark initial pull as done for providers that don't need it (local)
  useEffect(() => {
    if (!getExternalProvider(config.storageProvider)) {
      initialPullDoneRef.current = true;
    }
  }, [config.storageProvider]);

  return { scheduleSync, syncNow, pullRemote };
}
