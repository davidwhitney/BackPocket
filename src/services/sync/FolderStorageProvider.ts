import type { BookmarkIndex, PageSnapshot, AppConfig } from "../../types/index.ts";
import type { ExternalStorageProvider, SyncResult, PullResult } from "./ExternalStorageProvider.ts";
import {
  restoreHandle,
  getDirHandle,
  writeIndexToFolder,
  writeSnapshotToFolder,
  deleteSnapshotFromFolder,
  readIndexFromFolder,
  readAllSnapshotsFromFolder,
} from "../folder-sync.ts";

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
}
