import { useRef, useState } from "react";
import { AppConfig, StorageProvider, ViewMode } from "../types/index.ts";
import { exportAllData, importAllData } from "../services/storage.ts";
import { isFileSystemAccessSupported } from "../services/folder-sync.ts";
import { useConfirm } from "../hooks/useConfirm.ts";
import { FolderSyncConfig } from "./settings/FolderSyncConfig.tsx";
import { OneDriveConfig } from "./settings/OneDriveConfig.tsx";
import { DropboxConfig } from "./settings/DropboxConfig.tsx";

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
    a.download = `pockt-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ok = await confirm({
      title: "Restore from backup",
      message: "This will merge the backup data into your existing bookmarks. Bookmarks with the same ID will be overwritten. Continue?",
      confirmLabel: "Restore",
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
          {config.storageProvider !== "local" && <p className="help-text">Changes sync automatically when online.</p>}
        </div>
        {config.storageProvider === "folder" && <FolderSyncConfig config={config} setConfig={setConfig} onDataChange={onDataChange} syncNow={syncNow} />}
        {config.storageProvider === "onedrive" && <OneDriveConfig config={config} setConfig={setConfig} onDataChange={onDataChange} syncNow={syncNow} />}
        {config.storageProvider === "dropbox" && <DropboxConfig config={config} setConfig={setConfig} />}
        {config.storageProvider === "icloud" && <div className="info-box">iCloud sync requires the native app wrapper. Coming soon.</div>}
      </section>

      <section className="settings-section">
        <h2>Data</h2>
        <div className="data-actions">
          <div>
            <button className="btn btn-secondary" onClick={handleExport}>Export All Data</button>
            <p className="help-text">Downloads all bookmarks and cached pages as a JSON file.</p>
          </div>
          <div>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>Restore from Backup</button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileSelected} hidden />
            <p className="help-text">Import a previously exported backup file.</p>
            {importStatus && <p className={`import-status ${importStatus.startsWith("Error") ? "import-error" : ""}`}>{importStatus}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
