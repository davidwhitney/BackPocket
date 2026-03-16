import type { PageFetchStrategy } from "./strategies/PageFetchStrategy.ts";
import type { StorageEngine } from "./engines/StorageEngine.ts";
import { PwaPageFetchStrategy } from "./strategies/PwaPageFetchStrategy.ts";
import { IdbStorageEngine } from "./engines/IdbStorageEngine.ts";

export type Platform = "pwa" | "android" | "ios";

export function detectPlatform(): Platform {
  // Native wrappers will inject a global to identify themselves
  const w = window as any;
  if (w.__POCKT_PLATFORM === "android") return "android";
  if (w.__POCKT_PLATFORM === "ios") return "ios";
  return "pwa";
}

export interface PlatformServices {
  platform: Platform;
  storage: StorageEngine;
  pageFetch: PageFetchStrategy;
}

export function createPlatformServices(platform?: Platform): PlatformServices {
  const detected = platform ?? detectPlatform();

  // Future: switch on detected platform to return native implementations
  // case "android": return { storage: new AndroidStorageEngine(), pageFetch: new AndroidPageFetchStrategy(), ... }
  // case "ios": return { storage: new IosStorageEngine(), pageFetch: new IosPageFetchStrategy(), ... }

  return {
    platform: detected,
    storage: new IdbStorageEngine(),
    pageFetch: new PwaPageFetchStrategy(),
  };
}

// Singleton for the current platform
let _services: PlatformServices | null = null;

export function getPlatformServices(): PlatformServices {
  if (!_services) {
    _services = createPlatformServices();
  }
  return _services;
}
