import type { BookmarkIndex, PageSnapshot, AppConfig } from "../../types/index";
import type { ExternalStorageProvider, SyncResult, PullResult } from "./ExternalStorageProvider";
import { syncToOneDrive, syncFromOneDrive } from "../onedrive";
import { exportAllData } from "../storage";

// OneDrive uses the full export format (index + snapshots in one file)
// because the Graph API round-trips are expensive — one file is better than N.

let _setConfig: ((update: Partial<AppConfig>) => void) | null = null;

export function setOneDriveConfigSetter(fn: (update: Partial<AppConfig>) => void): void {
  _setConfig = fn;
}

export class OneDriveStorageProvider implements ExternalStorageProvider {
  readonly requiresOnline = true;

  async init(_config: AppConfig): Promise<void> {
    // No init needed — tokens are in config
  }

  isReady(config: AppConfig): boolean {
    return !!config.onedrive?.accessToken;
  }

  async pushIndex(_index: BookmarkIndex, config: AppConfig): Promise<SyncResult> {
    if (!_setConfig) return { success: false, error: "Config setter not available" };
    if (!config.onedrive?.accessToken) return { success: false, error: "Not authenticated" };

    // OneDrive syncs the full export (index + snapshots) in one file
    return syncToOneDrive(config, _setConfig, exportAllData);
  }

  async pushSnapshot(_snapshot: PageSnapshot, _config: AppConfig): Promise<SyncResult> {
    // Snapshots are included in the full export on next pushIndex
    return { success: true };
  }

  async deleteSnapshot(_id: string, _config: AppConfig): Promise<void> {
    // Deletion is reflected in the full export on next pushIndex
  }

  async pull(config: AppConfig): Promise<PullResult> {
    if (!_setConfig) return { success: false, error: "Config setter not available" };
    return syncFromOneDrive(config, _setConfig);
  }
}
