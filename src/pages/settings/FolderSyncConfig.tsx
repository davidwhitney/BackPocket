import { useState, useEffect } from "react";
import { AppConfig } from "../../types/index";
import { importAllData } from "../../services/storage";
import { pickFolder, persistHandle, restoreHandle, clearHandle, getDirHandle } from "../../services/folder-sync";
import { getExternalProvider } from "../../services/sync/registry";

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
      const provider = getExternalProvider("folder");
      if (!provider) { setStatus("Error: provider not available"); setSyncing(false); return; }
      const result = await provider.pull(config);
      if (!result.success || !result.data) {
        setStatus(`Error: ${result.error || "No data"}`);
        setSyncing(false);
        return;
      }
      const imported = await importAllData(result.data);
      setStatus(`Restored ${imported.bookmarks} bookmarks and ${imported.snapshots} snapshots`);
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
