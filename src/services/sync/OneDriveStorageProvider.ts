import type { BookmarkIndex, PageSnapshot, AppConfig } from "../../types/index";
import type { ExternalStorageProvider, SyncResult, PullResult } from "./ExternalStorageProvider";
import { syncToOneDrive, syncFromOneDrive, getFileETag } from "../onedrive";
import { exportAllData } from "../storage";

// OneDrive uses the full export format (index + snapshots in one file)
// because the Graph API round-trips are expensive — one file is better than N.

const DATA_FILE = "pockt-data.json";

let _setConfig: ((update: Partial<AppConfig>) => void) | null = null;

export function setOneDriveConfigSetter(fn: (update: Partial<AppConfig>) => void): void {
  _setConfig = fn;
}

function getAccessToken(config: AppConfig): string | null {
  return config.onedrive?.accessToken || null;
}

export class OneDriveStorageProvider implements ExternalStorageProvider {
  readonly requiresOnline = true;

  async init(_config: AppConfig): Promise<void> {}

  isReady(config: AppConfig): boolean {
    return !!config.onedrive?.accessToken;
  }

  async pushIndex(_index: BookmarkIndex, config: AppConfig): Promise<SyncResult> {
    if (!_setConfig) return { success: false, error: "Config setter not available" };
    if (!config.onedrive?.accessToken) return { success: false, error: "Not authenticated" };

    const result = await syncToOneDrive(config, _setConfig, exportAllData);

    // Store the new eTag after successful upload
    if (result.success) {
      const token = getAccessToken(config);
      if (token) {
        const eTag = await getFileETag(token, DATA_FILE);
        if (eTag) _setConfig({ lastRemoteETag: eTag });
      }
    }

    return result;
  }

  async pushSnapshot(_snapshot: PageSnapshot, _config: AppConfig): Promise<SyncResult> {
    return { success: true };
  }

  async deleteSnapshot(_id: string, _config: AppConfig): Promise<void> {}

  async pull(config: AppConfig): Promise<PullResult> {
    if (!_setConfig) return { success: false, error: "Config setter not available" };
    return syncFromOneDrive(config, _setConfig);
  }

  async hasRemoteChanges(config: AppConfig): Promise<boolean> {
    const token = getAccessToken(config);
    if (!token) return false;

    try {
      const remoteETag = await getFileETag(token, DATA_FILE);
      if (!remoteETag) return false; // No remote file yet
      if (!config.lastRemoteETag) return true; // Never synced
      return remoteETag !== config.lastRemoteETag;
    } catch {
      return true; // On error, assume changes
    }
  }
}
