import { useState, useEffect } from "react";
import { AppConfig } from "../../types/index.ts";
import { importAllData } from "../../services/storage.ts";
import {
  pickFolder,
  persistHandle,
  restoreHandle,
  clearHandle,
  readIndexFromFolder,
  readAllSnapshotsFromFolder,
  getDirHandle,
} from "../../services/folder-sync.ts";

interface Props {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
  onDataChange?: () => void;
  syncNow?: () => Promise<void>;
}

export function FolderSyncConfig({ config, setConfig, onDataChange, syncNow }: Props) {
  const [folderConnected, setFolderConnected] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    restoreHandle().then((h) => { if (h) setFolderConnected(true); });
  }, []);

  const handleChooseFolder = async () => {
    const handle = await pickFolder();
    if (!handle) return;
    await persistHandle(handle);
    setConfig({ folderName: handle.name });
    setFolderConnected(true);
    setStatus(`Connected to "${handle.name}"`);
    syncNow?.();
  };

  const handleDisconnect = async () => {
    await clearHandle();
    setConfig({ folderName: undefined });
    setFolderConnected(false);
    setStatus(null);
  };

  const handlePush = async () => {
    setSyncing(true);
    setStatus("Saving...");
    try {
      await syncNow?.();
      setStatus("Saved");
    } catch {
      setStatus("Error: sync failed");
    }
    setSyncing(false);
  };

  const handlePull = async () => {
    setSyncing(true);
    setStatus("Loading from folder...");
    try {
      if (!getDirHandle()) await restoreHandle();
      const index = await readIndexFromFolder();
      if (!index) { setStatus("No backup found in folder"); setSyncing(false); return; }
      setStatus("Loading snapshots...");
      const snapshots = await readAllSnapshotsFromFolder();
      const result = await importAllData(JSON.stringify({ index, snapshots }));
      setStatus(`Restored ${result.bookmarks} bookmarks and ${result.snapshots} snapshots`);
      onDataChange?.();
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Read failed"}`);
    }
    setSyncing(false);
  };

  const folderName = config.folderName || getDirHandle()?.name;

  return (
    <div className="provider-config">
      {folderConnected ? (
        <>
          <div className="provider-status-row">
            <span className="status-connected">{folderName || "Folder"}</span>
            <button className="btn btn-sm btn-secondary" onClick={handleChooseFolder}>Change</button>
            <button className="btn btn-sm btn-danger" onClick={handleDisconnect}>Disconnect</button>
          </div>
          <div className="sync-actions">
            <button className="btn btn-secondary btn-sm" onClick={handlePush} disabled={syncing}>Sync Now</button>
            <button className="btn btn-secondary btn-sm" onClick={handlePull} disabled={syncing}>Pull from Folder</button>
          </div>
          {config.lastSync && <p className="help-text">Last sync: {new Date(config.lastSync).toLocaleString()}</p>}
        </>
      ) : (
        <>
          <button className="btn btn-secondary" onClick={handleChooseFolder}>Choose Folder</button>
          <p className="help-text">
            Pick a folder on your device. If it's inside OneDrive, Dropbox, iCloud Drive, or Google Drive, your data syncs automatically across devices.
          </p>
        </>
      )}
      {status && <p className={`import-status ${status.startsWith("Error") ? "import-error" : ""}`}>{status}</p>}
    </div>
  );
}
