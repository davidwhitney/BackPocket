import { useState } from "react";
import { AppConfig, StorageProvider } from "../../types/index";
import { importAllData } from "../../services/import-export";
import { getExternalProvider } from "../../services/sync/registry";

interface Props {
  config: AppConfig;
  providerType: StorageProvider;
  pullLabel: string;
  syncNow?: () => Promise<void>;
  onDataChange?: () => void;
}

export function SyncControls({ config, providerType, pullLabel, syncNow, onDataChange }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handlePush = async () => {
    setSyncing(true);
    setStatus("Syncing...");
    try {
      await syncNow?.();
      setStatus("Synced");
    } catch {
      setStatus("Error: sync failed");
    }
    setSyncing(false);
  };

  const handlePull = async () => {
    setSyncing(true);
    setStatus("Downloading...");
    try {
      const provider = getExternalProvider(providerType);
      if (!provider) { setStatus("Error: provider not available"); setSyncing(false); return; }
      const result = await provider.pull(config);
      if (!result.success || !result.data) {
        setStatus(`Error: ${result.error || "No data"}`);
        setSyncing(false);
        return;
      }
      const imported = await importAllData(result.data);
      setStatus(`Restored ${imported.bookmarks} bookmark${imported.bookmarks !== 1 ? "s" : ""}`);
      onDataChange?.();
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Pull failed"}`);
    }
    setSyncing(false);
  };

  return (
    <>
      <div className="sync-actions">
        <button className="btn btn-secondary btn-sm" onClick={handlePush} disabled={syncing}>Sync Now</button>
        <button className="btn btn-secondary btn-sm" onClick={handlePull} disabled={syncing}>{pullLabel}</button>
      </div>
      {config.lastSync && <p className="help-text">Last sync: {new Date(config.lastSync).toLocaleString()}</p>}
      {status && <p className={`import-status ${status.startsWith("Error") ? "import-error" : ""}`}>{status}</p>}
    </>
  );
}
