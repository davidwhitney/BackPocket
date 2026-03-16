/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BACKPOCKET_ONEDRIVE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:pwa-register" {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: Error) => void;
  }): (reloadPage?: boolean) => Promise<void>;
}

interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistration {
  sync: SyncManager;
}
