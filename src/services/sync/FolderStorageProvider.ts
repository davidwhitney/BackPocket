import type { BookmarkIndex, PageSnapshot, AppConfig } from "../../types/index";
import type { ExternalStorageProvider, SyncResult, PullResult } from "./ExternalStorageProvider";
import {
  restoreHandle,
  getDirHandle,
  writeIndexToFolder,
  writeSnapshotToFolder,
  deleteSnapshotFromFolder,
  readIndexFromFolder,
  readAllSnapshotsFromFolder,
  readSnapshotFromFolder,
} from "../folder-sync";

export class FolderStorageProvider implements ExternalStorageProvider {
  readonly requiresOnline = false;

  async init(_config: AppConfig): Promise<void> {
    await restoreHandle();
  }

  isReady(_config: AppConfig): boolean {
    return getDirHandle() !== null;
  }

  async pushIndex(index: BookmarkIndex, _config: AppConfig): Promise<SyncResult> {
    if (!getDirHandle()) await restoreHandle();
    if (!getDirHandle()) return { success: false, error: "No folder connected" };

    const ok = await writeIndexToFolder(index);
    return ok ? { success: true } : { success: false, error: "Write failed" };
  }

  async pushSnapshot(snapshot: PageSnapshot, _config: AppConfig): Promise<SyncResult> {
    if (!getDirHandle()) return { success: false, error: "No folder connected" };

    const ok = await writeSnapshotToFolder(snapshot);
    return ok ? { success: true } : { success: false, error: "Write failed" };
  }

  async deleteSnapshot(id: string, _config: AppConfig): Promise<void> {
    if (!getDirHandle()) return;
    await deleteSnapshotFromFolder(id);
  }

  async pull(_config: AppConfig): Promise<PullResult> {
    if (!getDirHandle()) await restoreHandle();
    if (!getDirHandle()) return { success: false, error: "No folder connected" };

    const index = await readIndexFromFolder();
    if (!index) return { success: false, error: "No backup found in folder" };

    const snapshots = await readAllSnapshotsFromFolder();
    const data = JSON.stringify({ index, snapshots });
    return { success: true, data };
  }

  async fetchSnapshot(id: string, _config: AppConfig): Promise<PageSnapshot | null> {
    if (!getDirHandle()) await restoreHandle();
    if (!getDirHandle()) return null;
    return readSnapshotFromFolder(id);
  }

  async hasRemoteChanges(_config: AppConfig): Promise<boolean> {
    // Folder sync relies on OS-level file change detection — always pull
    return true;
  }
}
