import type { AppConfig } from "../types/index.ts";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const APP_FOLDER = "BackPocketDb";

interface OneDriveTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function getTokens(config: AppConfig): OneDriveTokens | null {
  if (!config.onedrive?.accessToken) return null;
  return {
    accessToken: config.onedrive.accessToken,
    refreshToken: config.onedrive.refreshToken,
    expiresAt: (config.onedrive as any).expiresAt ?? 0,
  };
}

async function refreshAccessToken(
  config: AppConfig,
  saveConfig: (update: Partial<AppConfig>) => void,
): Promise<string | null> {
  const tokens = getTokens(config);
  if (!tokens?.refreshToken || !config.onedrive?.clientId) return null;

  try {
    const resp = await fetch("/api/onedrive/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: config.onedrive.clientId,
        refreshToken: tokens.refreshToken,
      }),
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    saveConfig({
      onedrive: {
        ...config.onedrive,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken,
      },
    });
    return data.access_token;
  } catch {
    return null;
  }
}

async function getAccessToken(
  config: AppConfig,
  saveConfig: (update: Partial<AppConfig>) => void,
): Promise<string | null> {
  const tokens = getTokens(config);
  if (!tokens) return null;

  // If token looks expired (or we don't track expiry), try refresh
  if (tokens.expiresAt && Date.now() > tokens.expiresAt - 60_000) {
    return refreshAccessToken(config, saveConfig);
  }

  // Test the token with a lightweight call
  try {
    const resp = await fetch(`${GRAPH_BASE}/me/drive`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (resp.ok) return tokens.accessToken;
    if (resp.status === 401) return refreshAccessToken(config, saveConfig);
    return null;
  } catch {
    return null;
  }
}

async function graphFetch(
  accessToken: string,
  path: string,
  options?: RequestInit,
): Promise<Response> {
  return fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });
}

async function ensureAppFolder(accessToken: string): Promise<void> {
  // Try to get the folder — create it if it doesn't exist
  const resp = await graphFetch(accessToken, `/me/drive/root:/${APP_FOLDER}`);
  if (resp.ok) return;

  if (resp.status === 404) {
    await graphFetch(accessToken, "/me/drive/root/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: APP_FOLDER,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    });
  }
}

export async function uploadFile(
  accessToken: string,
  filename: string,
  content: string,
): Promise<boolean> {
  await ensureAppFolder(accessToken);

  const resp = await graphFetch(
    accessToken,
    `/me/drive/root:/${APP_FOLDER}/${filename}:/content`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: content,
    },
  );
  return resp.ok;
}

export async function downloadFile(
  accessToken: string,
  filename: string,
): Promise<string | null> {
  const resp = await graphFetch(
    accessToken,
    `/me/drive/root:/${APP_FOLDER}/${filename}:/content`,
  );
  if (!resp.ok) return null;
  return resp.text();
}

export async function listFiles(
  accessToken: string,
): Promise<string[]> {
  const resp = await graphFetch(
    accessToken,
    `/me/drive/root:/${APP_FOLDER}:/children?$select=name`,
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.value || []).map((f: any) => f.name);
}

// --- High-level sync API ---

export async function syncToOneDrive(
  config: AppConfig,
  saveConfig: (update: Partial<AppConfig>) => void,
  exportData: () => Promise<string>,
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getAccessToken(config, saveConfig);
  if (!accessToken) return { success: false, error: "Not authenticated" };

  try {
    const data = await exportData();
    const ok = await uploadFile(accessToken, "backpocket-data.json", data);
    if (ok) {
      saveConfig({ lastSync: new Date().toISOString() });
      return { success: true };
    }
    return { success: false, error: "Upload failed" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}

export async function syncFromOneDrive(
  config: AppConfig,
  saveConfig: (update: Partial<AppConfig>) => void,
): Promise<{ success: boolean; data?: string; error?: string }> {
  const accessToken = await getAccessToken(config, saveConfig);
  if (!accessToken) return { success: false, error: "Not authenticated" };

  try {
    const data = await downloadFile(accessToken, "backpocket-data.json");
    if (!data) return { success: false, error: "No backup found on OneDrive" };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Download failed" };
  }
}

export function getOneDriveAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "Files.ReadWrite.AppFolder offline_access",
    response_mode: "query",
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}
