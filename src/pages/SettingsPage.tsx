import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppConfig, StorageProvider, ViewMode } from "../types/index.ts";
import { exportAllData, importAllData } from "../services/storage.ts";
import { getOneDriveAuthUrl, syncFromOneDrive } from "../services/onedrive.ts";
import {
  isFileSystemAccessSupported,
  pickFolder,
  persistHandle,
  restoreHandle,
  clearHandle,
  readIndexFromFolder,
  readAllSnapshotsFromFolder,
  getDirHandle,
} from "../services/folder-sync.ts";
import { useConfirm } from "../hooks/useConfirm.ts";

interface Props {
  config: {
    config: AppConfig;
    setConfig: (update: Partial<AppConfig>) => void;
  };
  onDataChange?: () => void;
  syncNow?: () => Promise<void>;
}

export function SettingsPage({ config: { config, setConfig }, onDataChange, syncNow }: Props) {
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backpocket-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ok = await confirm({
      title: "Restore from backup",
      message: "This will merge the backup data into your existing bookmarks. Bookmarks with the same ID will be overwritten. Continue?",
      confirmLabel: "Restore",
      destructive: false,
    });
    if (!ok) return;

    setImportStatus("Reading file...");
    try {
      const json = await file.text();
      setImportStatus("Importing...");
      const result = await importAllData(json);
      setImportStatus(`Restored ${result.bookmarks} bookmark${result.bookmarks !== 1 ? "s" : ""} and ${result.snapshots} snapshot${result.snapshots !== 1 ? "s" : ""}.`);
      onDataChange?.();
    } catch (err) {
      setImportStatus(`Error: ${err instanceof Error ? err.message : "Import failed"}`);
    }
  };

  const isProviderActive = config.storageProvider !== "local";

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="form-group">
          <label>Theme</label>
          <div className="radio-group">
            {(["system", true, false] as const).map((value) => {
              const label = value === "system" ? "System" : value ? "Dark" : "Light";
              return (
                <label key={String(value)} className="radio-label">
                  <input type="radio" name="theme" checked={config.darkMode === value} onChange={() => setConfig({ darkMode: value })} />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label>View Mode</label>
          <div className="radio-group">
            {(["card", "compact", "list"] as ViewMode[]).map((value) => {
              const labels: Record<ViewMode, string> = { card: "Cards", compact: "List", list: "Compact" };
              return (
                <label key={value} className="radio-label">
                  <input type="radio" name="viewMode" checked={config.viewMode === value} onChange={() => setConfig({ viewMode: value })} />
                  <span>{labels[value]}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Sync</h2>
        <div className="form-group">
          <label>Sync Provider</label>
          <select value={config.storageProvider} onChange={(e) => setConfig({ storageProvider: e.target.value as StorageProvider })}>
            <option value="local">None (Device Only)</option>
            {isFileSystemAccessSupported() && <option value="folder">Local Folder</option>}
            <option value="onedrive">OneDrive</option>
            <option value="icloud">iCloud</option>
            <option value="dropbox">Dropbox</option>
          </select>
          {isProviderActive && (
            <p className="help-text">Changes sync automatically when online.</p>
          )}
        </div>

        {config.storageProvider === "folder" && (
          <FolderSyncConfig config={config} setConfig={setConfig} onDataChange={onDataChange} syncNow={syncNow} />
        )}
        {config.storageProvider === "onedrive" && (
          <OneDriveConfig config={config} setConfig={setConfig} onDataChange={onDataChange} syncNow={syncNow} />
        )}
        {config.storageProvider === "dropbox" && (
          <DropboxConfig config={config} setConfig={setConfig} />
        )}
        {config.storageProvider === "icloud" && (
          <div className="info-box">iCloud sync requires the native app wrapper. Coming soon.</div>
        )}
      </section>

      <section className="settings-section">
        <h2>Data</h2>
        <div className="data-actions">
          <div>
            <button className="btn btn-secondary" onClick={handleExport}>Export All Data</button>
            <p className="help-text">Downloads all bookmarks and cached pages as a JSON file.</p>
          </div>
          <div>
            <button className="btn btn-secondary" onClick={handleImportClick}>Restore from Backup</button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileSelected} hidden />
            <p className="help-text">Import a previously exported backup file.</p>
            {importStatus && <p className={`import-status ${importStatus.startsWith("Error") ? "import-error" : ""}`}>{importStatus}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Folder Sync
// ============================================================

function FolderSyncConfig({ config, setConfig, onDataChange, syncNow }: {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
  onDataChange?: () => void;
  syncNow?: () => Promise<void>;
}) {
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
    // Trigger an initial sync
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

// ============================================================
// OneDrive
// ============================================================

function OneDriveConfig({ config, setConfig, onDataChange, syncNow }: {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
  onDataChange?: () => void;
  syncNow?: () => Promise<void>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientId, setClientId] = useState(config.onedrive?.clientId || "");
  const [status, setStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const isConnected = !!config.onedrive?.accessToken;

  useEffect(() => {
    if (searchParams.get("onedrive_connected") === "true") {
      const accessToken = searchParams.get("access_token") || "";
      const refreshToken = searchParams.get("refresh_token") || "";
      const expiresIn = parseInt(searchParams.get("expires_in") || "3600");
      if (accessToken) {
        setConfig({
          onedrive: { clientId: config.onedrive?.clientId || clientId, accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000 },
        });
        setStatus("Connected to OneDrive");
      }
      searchParams.delete("onedrive_connected");
      searchParams.delete("access_token");
      searchParams.delete("refresh_token");
      searchParams.delete("expires_in");
      setSearchParams(searchParams, { replace: true });
    }
    const error = searchParams.get("onedrive_error");
    if (error) {
      setStatus(`Error: ${error}`);
      searchParams.delete("onedrive_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    if (!clientId.trim()) { setStatus("Enter a Client ID first"); return; }
    setConfig({ onedrive: { clientId: clientId.trim(), accessToken: "", refreshToken: "" } });
    const redirectUri = `${window.location.origin}/api/onedrive/callback`;
    window.location.href = getOneDriveAuthUrl(clientId.trim(), redirectUri) + `&state=${encodeURIComponent(clientId.trim())}`;
  };

  const handleDisconnect = () => { setConfig({ onedrive: undefined }); setStatus(null); };

  const handlePush = async () => {
    setSyncing(true);
    setStatus("Uploading...");
    try {
      await syncNow?.();
      setStatus("Uploaded");
    } catch {
      setStatus("Error: sync failed");
    }
    setSyncing(false);
  };

  const handlePull = async () => {
    setSyncing(true);
    setStatus("Downloading from OneDrive...");
    const result = await syncFromOneDrive(config, setConfig);
    if (result.success && result.data) {
      try {
        const imported = await importAllData(result.data);
        setStatus(`Restored ${imported.bookmarks} bookmarks`);
        onDataChange?.();
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : "Import failed"}`);
      }
    } else {
      setStatus(`Error: ${result.error}`);
    }
    setSyncing(false);
  };

  return (
    <div className="provider-config">
      {isConnected ? (
        <>
          <div className="provider-status-row">
            <span className="status-connected">Connected</span>
            <button className="btn btn-sm btn-danger" onClick={handleDisconnect}>Disconnect</button>
          </div>
          <div className="sync-actions">
            <button className="btn btn-secondary btn-sm" onClick={handlePush} disabled={syncing}>Sync Now</button>
            <button className="btn btn-secondary btn-sm" onClick={handlePull} disabled={syncing}>Pull from OneDrive</button>
          </div>
          {config.lastSync && <p className="help-text">Last sync: {new Date(config.lastSync).toLocaleString()}</p>}
        </>
      ) : (
        <>
          <div className="form-group">
            <label>Client ID</label>
            <input type="text" placeholder="Azure App Registration Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} />
            <p className="help-text">
              Create an app at{" "}
              <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps" target="_blank" rel="noopener noreferrer" className="settings-link">Azure App Registrations</a>
              {" "}with redirect URI: <code>{window.location.origin}/api/onedrive/callback</code>
            </p>
          </div>
          <button className="btn btn-secondary" onClick={handleConnect} disabled={!clientId.trim()}>Connect OneDrive</button>
        </>
      )}
      {status && <p className={`import-status ${status.startsWith("Error") ? "import-error" : ""}`}>{status}</p>}
      <p className="help-text">Data is stored in OneDrive/Apps/BackPocketDb/</p>
    </div>
  );
}

// ============================================================
// Dropbox (stub)
// ============================================================

function DropboxConfig({ config, setConfig }: { config: AppConfig; setConfig: (update: Partial<AppConfig>) => void }) {
  const isConnected = !!config.dropbox?.accessToken;
  const handleConnect = () => {
    const id = prompt("Enter your Dropbox App Key:");
    if (!id) return;
    setConfig({ dropbox: { clientId: id, accessToken: "", refreshToken: "" } });
    alert("OAuth flow would redirect to Dropbox login. For now, the app key has been saved.");
  };

  return (
    <div className="provider-config">
      {isConnected ? (
        <div className="provider-status-row">
          <span className="status-connected">Connected</span>
          <button className="btn btn-sm btn-danger" onClick={() => setConfig({ dropbox: undefined })}>Disconnect</button>
        </div>
      ) : (
        <button className="btn btn-secondary" onClick={handleConnect}>Connect Dropbox</button>
      )}
      <p className="help-text">Data will be stored in Dropbox/Apps/BackPocketDb/</p>
    </div>
  );
}
