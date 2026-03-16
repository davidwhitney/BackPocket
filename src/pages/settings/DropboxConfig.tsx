import { AppConfig } from "../../types/index.ts";

interface Props {
  config: AppConfig;
  setConfig: (update: Partial<AppConfig>) => void;
}

export function DropboxConfig({ config, setConfig }: Props) {
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
      <p className="help-text">Data will be stored in Dropbox/Apps/PocktDb/</p>
    </div>
  );
}
