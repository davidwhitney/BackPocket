import type { AppConfig } from "../types/index";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const MS_TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const MS_AUTH_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";
const APP_FOLDER = "PocktDb";
const PKCE_STORAGE_KEY = "pockt_pkce_verifier";

// --- PKCE helpers ---

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// --- Auth flow (fully client-side) ---

export function getOneDriveRedirectUri(): string {
  return `${window.location.origin}/settings`;
}

export async function startOneDriveAuth(clientId: string): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store verifier for after redirect
  sessionStorage.setItem(PKCE_STORAGE_KEY, codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getOneDriveRedirectUri(),
    scope: "Files.ReadWrite offline_access",
    response_mode: "query",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: "onedrive",
  });

  window.location.href = `${MS_AUTH_URL}?${params}`;
}

export async function exchangeOneDriveCode(
  clientId: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const codeVerifier = sessionStorage.getItem(PKCE_STORAGE_KEY);
  sessionStorage.removeItem(PKCE_STORAGE_KEY);

  if (!codeVerifier) return null;

  try {
    const resp = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        code,
        redirect_uri: getOneDriveRedirectUri(),
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
        scope: "Files.ReadWrite offline_access",
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("OneDrive token exchange failed:", err);
      return null;
    }

    const data = await resp.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      expiresIn: data.expires_in || 3600,
    };
  } catch (err) {
    console.error("OneDrive token exchange error:", err);
    return null;
  }
}

// --- Token management ---

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
    expiresAt: config.onedrive.expiresAt ?? 0,
  };
}

async function refreshAccessToken(
  config: AppConfig,
  saveConfig: (update: Partial<AppConfig>) => void,
): Promise<string | null> {
  const tokens = getTokens(config);
  if (!tokens?.refreshToken || !config.onedrive?.clientId) return null;

  try {
    const resp = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.onedrive.clientId,
        refresh_token: tokens.refreshToken,
        grant_type: "refresh_token",
        scope: "Files.ReadWrite offline_access",
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    saveConfig({
      onedrive: {
        ...config.onedrive,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
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

  if (tokens.expiresAt > 0 && Date.now() > tokens.expiresAt - 60_000) {
    return refreshAccessToken(config, saveConfig);
  }

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

// --- Graph API operations ---

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
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: content },
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
    const ok = await uploadFile(accessToken, "pockt-data.json", data);
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
    const data = await downloadFile(accessToken, "pockt-data.json");
    if (!data) return { success: false, error: "No backup found on OneDrive" };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Download failed" };
  }
}
