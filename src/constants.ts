// --- Database names ---
export const DB_NAME = "backpocket";
export const DB_VERSION = 1;
export const QUEUE_DB_NAME = "backpocket_queue";
export const QUEUE_DB_VERSION = 1;
export const CONFIG_KEY = "backpocket_config";

// --- Service worker message types ---
export const SW_MESSAGES = {
  SKIP_WAITING: "SKIP_WAITING",
  SNAPSHOTS_SYNCED: "SNAPSHOTS_SYNCED",
} as const;

// --- Background sync tags ---
export const SYNC_TAG_SNAPSHOT_QUEUE = "snapshot-queue";

// --- Cache names ---
export const CACHE_NAMES = {
  PAGES: "pages-cache",
  STATIC_ASSETS: "static-assets",
  IMAGES: "images",
  SNAPSHOTS: "snapshot-fetches",
} as const;

// --- Cache TTLs (seconds) ---
export const CACHE_MAX_AGE = {
  STATIC_ASSETS: 30 * 24 * 60 * 60,
  IMAGES: 7 * 24 * 60 * 60,
  SNAPSHOTS: 90 * 24 * 60 * 60,
} as const;

// --- Timeouts ---
export const FETCH_PAGE_TIMEOUT_MS = 10_000;
export const NETWORK_TIMEOUT_SECONDS = 15;
export const METADATA_DEBOUNCE_MS = 600;
export const SEARCH_DEBOUNCE_MS = 300;
