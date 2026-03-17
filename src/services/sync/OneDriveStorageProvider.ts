import type { BookmarkIndex, PageSnapshot, AppConfig } from "../../types/index";
import type { ExternalStorageProvider, SyncResult, PullResult } from "./ExternalStorageProvider";
import {
  uploadFile,
  downloadFile,
  deleteRemoteFile,
  getFileETag,
} from "../onedrive";

const INDEX_FILE = "index.json";

let _setConfig: ((update: Partial<AppConfig>) => void) | null = null;

export function setOneDriveConfigSetter(fn: (update: Partial<AppConfig>) => void): void {
  _setConfig = fn;
}

function getToken(config: AppConfig): string | null {
  return config.onedrive?.accessToken || null;
}

function snapshotFilename(id: string): string {
  return `snapshots/${id}.json`;
}

export class OneDriveStorageProvider implements ExternalStorageProvider {
  readonly requiresOnline = true;

  async init(_config: AppConfig): Promise<void> {}

  isReady(config: AppConfig): boolean {
    return !!config.onedrive?.accessToken;
  }

  async pushIndex(index: BookmarkIndex, config: AppConfig): Promise<SyncResult> {
    const token = getToken(config);
    if (!token) return { success: false, error: "Not authenticated" };

    try {
      const ok = await uploadFile(token, INDEX_FILE, JSON.stringify(index, null, 2));
      if (!ok) return { success: false, error: "Upload failed" };

      // Store the new eTag
      if (_setConfig) {
        const eTag = await getFileETag(token, INDEX_FILE);
        if (eTag) _setConfig({ lastRemoteETag: eTag });
        _setConfig({ lastSync: new Date().toISOString() });
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Sync failed" };
    }
  }

  async pushSnapshot(snapshot: PageSnapshot, config: AppConfig): Promise<SyncResult> {
    const token = getToken(config);
    if (!token) return { success: false, error: "Not authenticated" };

    try {
      const ok = await uploadFile(token, snapshotFilename(snapshot.id), JSON.stringify(snapshot));
      return ok ? { success: true } : { success: false, error: "Upload failed" };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
    }
  }

  async deleteSnapshot(id: string, config: AppConfig): Promise<void> {
    const token = getToken(config);
    if (!token) return;

    try {
      await deleteRemoteFile(token, snapshotFilename(id));
    } catch {
      // File may not exist remotely
    }
  }

  async pull(config: AppConfig): Promise<PullResult> {
    const token = getToken(config);
    if (!token) return { success: false, error: "Not authenticated" };

    try {
      const indexData = await downloadFile(token, INDEX_FILE);

      // Fallback: try legacy single-file format
      if (!indexData) {
        const legacyData = await downloadFile(token, "pockt-data.json");
        if (legacyData) return { success: true, data: legacyData };
        return { success: false, error: "No backup found on OneDrive" };
      }

      const index = JSON.parse(indexData) as BookmarkIndex;

      // Only pull the index — snapshots are fetched on demand in getSnapshot()
      const data = JSON.stringify({ index, snapshots: [] });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Download failed" };
    }
  }

  async fetchSnapshot(id: string, config: AppConfig): Promise<PageSnapshot | null> {
    const token = getToken(config);
    if (!token) return null;

    try {
      const content = await downloadFile(token, snapshotFilename(id));
      if (!content) return null;
      return JSON.parse(content) as PageSnapshot;
    } catch {
      return null;
    }
  }

  async hasRemoteChanges(config: AppConfig): Promise<boolean> {
    const token = getToken(config);
    if (!token) return false;

    try {
      const remoteETag = await getFileETag(token, INDEX_FILE);
      if (!remoteETag) return false;
      if (!config.lastRemoteETag) return true;
      return remoteETag !== config.lastRemoteETag;
    } catch {
      return true;
    }
  }
}
