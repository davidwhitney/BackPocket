import type { BookmarkIndex, PageSnapshot, AppConfig } from "../../types/index";

export interface SyncResult {
  success: boolean;
  error?: string;
}

export interface PullResult extends SyncResult {
  data?: string;
}

export interface ExternalStorageProvider {
  /** Whether this provider requires network access (false for local folder) */
  readonly requiresOnline: boolean;

  /** Initialise / restore session state (e.g. restore folder handle). Called on app launch. */
  init(config: AppConfig): Promise<void>;

  /** Whether the provider is connected and ready to sync */
  isReady(config: AppConfig): boolean;

  /** Push the bookmark index to the remote */
  pushIndex(index: BookmarkIndex, config: AppConfig): Promise<SyncResult>;

  /** Push a single snapshot to the remote */
  pushSnapshot(snapshot: PageSnapshot, config: AppConfig): Promise<SyncResult>;

  /** Delete a snapshot from the remote */
  deleteSnapshot(id: string, config: AppConfig): Promise<void>;

  /** Pull all data from the remote (for manual restore) */
  pull(config: AppConfig): Promise<PullResult>;

  /** Fetch a single snapshot on demand from the remote (for lazy loading) */
  fetchSnapshot(id: string, config: AppConfig): Promise<PageSnapshot | null>;

  /** Check if remote has changed since last sync (cheap/fast). Returns true if unknown. */
  hasRemoteChanges(config: AppConfig): Promise<boolean>;
}
