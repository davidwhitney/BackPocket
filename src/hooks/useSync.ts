import { useRef, useCallback, useEffect } from "react";
import { AppConfig } from "../types/index.ts";
import { loadIndex } from "../services/storage.ts";
import { getExternalProvider } from "../services/sync/registry.ts";
import { setOneDriveConfigSetter } from "../services/sync/OneDriveStorageProvider.ts";
import { useDebounce } from "./useDebounce.ts";
import { SYNC_DEBOUNCE_MS } from "../constants.ts";

interface UseSyncOptions {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
}

export function useSync({ config, setConfig }: UseSyncOptions) {
  const syncingRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;
  const setConfigRef = useRef(setConfig);
  setConfigRef.current = setConfig;

  // Keep OneDrive provider's config setter in sync
  useEffect(() => {
    setOneDriveConfigSetter(setConfig);
  }, [setConfig]);

  // Initialise the active provider on mount / provider change
  useEffect(() => {
    const provider = getExternalProvider(config.storageProvider);
    provider?.init(config);
  }, [config.storageProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;

    const cfg = configRef.current;
    const provider = getExternalProvider(cfg.storageProvider);
    if (!provider) return;
    if (provider.requiresOnline && !navigator.onLine) return;

    // Ensure provider is initialised
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
    const handler = () => scheduleSync();
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [config.storageProvider, scheduleSync]);

  // Initial sync on app launch
  useEffect(() => {
    const provider = getExternalProvider(config.storageProvider);
    if (!provider) return;
    const timer = setTimeout(() => scheduleSync(), 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { scheduleSync, syncNow };
}
