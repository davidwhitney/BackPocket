import { AppConfig, StorageProvider, ViewMode } from "../types/index.ts";
import { exportAllData } from "../services/storage.ts";

interface Props {
  config: {
    config: AppConfig;
    setConfig: (update: Partial<AppConfig>) => void;
  };
}

export function SettingsPage({ config: { config, setConfig } }: Props) {
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
                  <input
                    type="radio"
                    name="theme"
                    checked={config.darkMode === value}
                    onChange={() => setConfig({ darkMode: value })}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label>View Mode</label>
          <div className="radio-group">
            {(["card", "list"] as ViewMode[]).map((value) => (
              <label key={value} className="radio-label">
                <input
                  type="radio"
                  name="viewMode"
                  checked={config.viewMode === value}
                  onChange={() => setConfig({ viewMode: value })}
                />
                <span>{value === "card" ? "Cards" : "List"}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Storage</h2>
        <div className="form-group">
          <label>Storage Provider</label>
          <select
            value={config.storageProvider}
            onChange={(e) =>
              setConfig({ storageProvider: e.target.value as StorageProvider })
            }
          >
            <option value="local">Local (Device Only)</option>
            <option value="onedrive">OneDrive</option>
            <option value="icloud">iCloud</option>
            <option value="dropbox">Dropbox</option>
          </select>
        </div>

        {config.storageProvider === "onedrive" && (
          <OneDriveConfig config={config} setConfig={setConfig} />
        )}
        {config.storageProvider === "dropbox" && (
          <DropboxConfig config={config} setConfig={setConfig} />
        )}
        {config.storageProvider === "icloud" && (
          <div className="info-box">
            iCloud sync requires the native app wrapper. Coming soon.
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>Data</h2>
        <button className="btn btn-secondary" onClick={handleExport}>
          Export All Data
        </button>
        <p className="help-text">
          Downloads all bookmarks and cached pages as a JSON file.
        </p>
      </section>
    </div>
  );
}

function OneDriveConfig({
  config,
  setConfig,
}: {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
}) {
  const isConnected = !!config.onedrive?.accessToken;

  const handleConnect = () => {
    const clientId = prompt("Enter your OneDrive App Client ID:");
    if (!clientId) return;
    // In production, this would initiate OAuth flow
    setConfig({
      onedrive: {
        clientId,
        accessToken: "",
        refreshToken: "",
      },
    });
    alert(
      "OAuth flow would redirect to Microsoft login. For now, the client ID has been saved.",
    );
  };

  return (
    <div className="provider-config">
      {isConnected ? (
        <div>
          <span className="status-connected">Connected</span>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => setConfig({ onedrive: undefined })}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button className="btn btn-secondary" onClick={handleConnect}>
          Connect OneDrive
        </button>
      )}
      <p className="help-text">
        Data will be stored in OneDrive/Apps/BackPocketDb/
      </p>
    </div>
  );
}

function DropboxConfig({
  config,
  setConfig,
}: {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
}) {
  const isConnected = !!config.dropbox?.accessToken;

  const handleConnect = () => {
    const clientId = prompt("Enter your Dropbox App Key:");
    if (!clientId) return;
    setConfig({
      dropbox: {
        clientId,
        accessToken: "",
        refreshToken: "",
      },
    });
    alert(
      "OAuth flow would redirect to Dropbox login. For now, the app key has been saved.",
    );
  };

  return (
    <div className="provider-config">
      {isConnected ? (
        <div>
          <span className="status-connected">Connected</span>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => setConfig({ dropbox: undefined })}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button className="btn btn-secondary" onClick={handleConnect}>
          Connect Dropbox
        </button>
      )}
      <p className="help-text">
        Data will be stored in Dropbox/Apps/BackPocketDb/
      </p>
    </div>
  );
}
