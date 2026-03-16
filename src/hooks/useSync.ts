import { useRef, useCallback, useEffect } from "react";
import { AppConfig } from "../types/index";
import { loadIndex, importAllData } from "../services/storage";
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

  const pullRemote = useCallback(async () => {
    const cfg = configRef.current;
    const provider = getExternalProvider(cfg.storageProvider);
    if (!provider) return;
    if (provider.requiresOnline && !navigator.onLine) return;

    if (!provider.isReady(cfg)) {
      await provider.init(cfg);
      if (!provider.isReady(cfg)) return;
    }

    // Check if remote has changed before downloading
    const changed = await provider.hasRemoteChanges(cfg);
    if (!changed) return;

    try {
      const result = await provider.pull(cfg);
      if (result.success && result.data) {
        await importAllData(result.data);
        onDataPulledRef.current?.();
      }
    } catch (err) {
      console.warn("Pull failed:", err);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;

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
    const handler = () => {
      pullRemote().then(() => scheduleSync());
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [config.storageProvider, scheduleSync, pullRemote]);

  // On startup: pull remote changes, then push local
  useEffect(() => {
    const provider = getExternalProvider(config.storageProvider);
    if (!provider) return;
    const timer = setTimeout(async () => {
      await pullRemote();
      scheduleSync();
    }, 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { scheduleSync, syncNow, pullRemote };
}
