import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppConfig } from "../../types/index.ts";
import { importAllData } from "../../services/storage.ts";
import { getOneDriveAuthUrl, syncFromOneDrive } from "../../services/onedrive.ts";

interface Props {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
  onDataChange?: () => void;
  syncNow?: () => Promise<void>;
}

export function OneDriveConfig({ config, setConfig, onDataChange, syncNow }: Props) {
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
    try { await syncNow?.(); setStatus("Uploaded"); }
    catch { setStatus("Error: sync failed"); }
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
