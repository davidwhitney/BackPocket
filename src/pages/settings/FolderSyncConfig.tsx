import { useState, useEffect } from "react";
import { AppConfig } from "../../types/index";
import { pickFolder, persistHandle, restoreHandle, clearHandle, getDirHandle } from "../../services/folder-sync";
import { SyncControls } from "./SyncControls";

interface Props {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
  onDataChange?: () => void;
  syncNow?: () => Promise<void>;
}

export function FolderSyncConfig({ config, setConfig, onDataChange, syncNow }: Props) {
  const [folderConnected, setFolderConnected] = useState(false);

  useEffect(() => {
    restoreHandle().then((h) => { if (h) setFolderConnected(true); });
  }, []);

  const handleChooseFolder = async () => {
    const handle = await pickFolder();
    if (!handle) return;
    await persistHandle(handle);
    setConfig({ folderName: handle.name });
    setFolderConnected(true);
    syncNow?.();
  };

  const handleDisconnect = async () => {
    await clearHandle();
    setConfig({ folderName: undefined });
    setFolderConnected(false);
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
          <SyncControls config={config} providerType="folder" pullLabel="Pull from Folder" syncNow={syncNow} onDataChange={onDataChange} />
        </>
      ) : (
        <>
          <button className="btn btn-secondary" onClick={handleChooseFolder}>Choose Folder</button>
          <p className="help-text">
            Pick a folder on your device. If it's inside OneDrive, Dropbox, iCloud Drive, or Google Drive, your data syncs automatically across devices.
          </p>
        </>
      )}
    </div>
  );
}
