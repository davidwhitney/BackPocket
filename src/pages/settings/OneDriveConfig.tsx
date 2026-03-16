import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppConfig } from "../../types/index";
import { importAllData } from "../../services/storage";
import { startOneDriveAuth, exchangeOneDriveCode } from "../../services/onedrive";
import { getExternalProvider } from "../../services/sync/registry";

const CLIENT_ID = import.meta.env.POCKT_ONEDRIVE_CLIENT_ID;

interface Props {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
  onDataChange?: () => void;
  syncNow?: () => Promise<void>;
}

export function OneDriveConfig({ config, setConfig, onDataChange, syncNow }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const isConnected = !!config.onedrive?.accessToken;

  // Handle OAuth callback — code arrives as ?code=...&state=onedrive
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state === "onedrive") {
      searchParams.delete("code");
      searchParams.delete("state");
      searchParams.delete("session_state");
      setSearchParams(searchParams, { replace: true });

      setStatus("Connecting...");
      exchangeOneDriveCode(CLIENT_ID, code).then((tokens) => {
        if (tokens) {
          setConfig({
            onedrive: {
              clientId: CLIENT_ID,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: Date.now() + tokens.expiresIn * 1000,
            },
          });
          setStatus("Connected to OneDrive");
        } else {
          setStatus("Error: failed to connect");
        }
      });
    }

    const error = searchParams.get("error");
    if (error) {
      setStatus(`Error: ${searchParams.get("error_description") || error}`);
      searchParams.delete("error");
      searchParams.delete("error_description");
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    setConfig({ onedrive: { clientId: CLIENT_ID, accessToken: "", refreshToken: "" } });
    startOneDriveAuth(CLIENT_ID);
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
    try {
      const provider = getExternalProvider("onedrive");
      if (!provider) { setStatus("Error: provider not available"); setSyncing(false); return; }
      const result = await provider.pull(config);
      if (!result.success || !result.data) {
        setStatus(`Error: ${result.error || "No data"}`);
        setSyncing(false);
        return;
      }
      const imported = await importAllData(result.data);
      setStatus(`Restored ${imported.bookmarks} bookmarks`);
      onDataChange?.();
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Import failed"}`);
    }
    setSyncing(false);
  };

  if (!CLIENT_ID) {
    return (
      <div className="provider-config">
        <div className="info-box">OneDrive integration is not configured. Set POCKT_ONEDRIVE_CLIENT_ID in your .env file.</div>
      </div>
    );
  }

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
        <button className="btn btn-secondary" onClick={handleConnect}>Connect OneDrive</button>
      )}
      {status && <p className={`import-status ${status.startsWith("Error") ? "import-error" : ""}`}>{status}</p>}
      <p className="help-text">Data is stored in OneDrive/PocktDb/</p>
    </div>
  );
}
