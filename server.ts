import { serveDir } from "jsr:@std/http/file-server";
import { DOMParser } from "jsr:@b-fuze/deno-dom";

const PORT = parseInt(Deno.env.get("PORT") || "8000");

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/fetch-page") {
    return handleFetchPage(url);
  }
  if (url.pathname === "/api/onedrive/callback") {
    return handleOneDriveCallback(url);
  }
  if (url.pathname === "/api/onedrive/refresh" && req.method === "POST") {
    return handleOneDriveRefresh(req);
  }

  const response = await serveDir(req, {
    fsRoot: "dist",
    quiet: true,
  });

  if (response.status === 404) {
    const indexFile = await Deno.readFile("dist/index.html");
    return new Response(indexFile, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return response;
});

console.log(`BackPocket server running on http://localhost:${PORT}`);

// ============================================================
// Page fetch + content extraction
// ============================================================

async function handleFetchPage(reqUrl: URL): Promise<Response> {
  const targetUrl = reqUrl.searchParams.get("url");
  if (!targetUrl) {
    return Response.json({ error: "Missing ?url= parameter" }, { status: 400 });
  }

  try {
    new URL(targetUrl);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // FETCH_PAGE_TIMEOUT_MS

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BackPocket/1.0; +https://github.com/backpocket)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return Response.json(
        { error: `Upstream returned ${response.status}` },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return Response.json(
        { error: "Not an HTML page" },
        { status: 422 },
      );
    }

    const html = await response.text();
    const extracted = extractArticleContent(html, targetUrl);

    return Response.json(
      { ...extracted, url: targetUrl },
      {
        headers: { "Cache-Control": "public, max-age=300" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return Response.json({ error: message }, { status: 502 });
  }
}

const REMOVE_SELECTORS = [
  "script", "style", "noscript", "iframe", "object", "embed",
  "nav", "header", "footer",
  "[role='navigation']", "[role='banner']", "[role='contentinfo']",
  ".nav", ".navbar", ".header", ".footer", ".sidebar", ".menu",
  ".ad", ".ads", ".advertisement", ".social-share", ".share-buttons",
  ".cookie-banner", ".cookie-notice", ".popup", ".modal",
  ".comments", ".comment-section", "#comments",
  ".related-posts", ".recommended", ".newsletter",
].join(", ");

const ARTICLE_SELECTORS = [
  "article",
  "[role='main'] article",
  "[role='main']",
  "main",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".content",
  "#content",
  ".post",
  ".article",
];

function extractArticleContent(html: string, _url: string): {
  html: string;
  title: string;
  description: string;
  content: string;
  textContent: string;
} {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) {
    return { html, title: "", description: "", content: html, textContent: "" };
  }

  const title = doc.querySelector("title")?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() || "";
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() || "";

  for (const el of doc.querySelectorAll(REMOVE_SELECTORS)) {
    el.remove();
  }

  let articleEl = null;
  for (const selector of ARTICLE_SELECTORS) {
    articleEl = doc.querySelector(selector);
    if (articleEl) break;
  }

  const contentRoot = articleEl || doc.body;
  if (!contentRoot) {
    return { html, title, description, content: "", textContent: "" };
  }

  for (const el of contentRoot.querySelectorAll(REMOVE_SELECTORS)) {
    el.remove();
  }

  for (const el of contentRoot.querySelectorAll("[hidden], [aria-hidden='true'], .hidden, .visually-hidden, .sr-only")) {
    el.remove();
  }

  for (const el of contentRoot.querySelectorAll("div, span")) {
    if (!el.textContent?.trim() && !el.querySelector("img, video, picture, figure, svg")) {
      el.remove();
    }
  }

  const content = contentRoot.innerHTML || "";
  const textContent = contentRoot.textContent || "";

  return { html, title, description, content, textContent };
}

// ============================================================
// OneDrive OAuth
// ============================================================

const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

async function handleOneDriveCallback(reqUrl: URL): Promise<Response> {
  const code = reqUrl.searchParams.get("code");
  const clientId = reqUrl.searchParams.get("state"); // We pass clientId as state
  const error = reqUrl.searchParams.get("error");

  if (error) {
    return redirectToSettings(`onedrive_error=${encodeURIComponent(reqUrl.searchParams.get("error_description") || error)}`);
  }

  if (!code || !clientId) {
    return redirectToSettings("onedrive_error=missing_code");
  }

  const redirectUri = `${reqUrl.origin}/api/onedrive/callback`;

  try {
    const tokenResp = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "Files.ReadWrite.AppFolder offline_access",
      }),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      console.error("OneDrive token exchange failed:", err);
      return redirectToSettings("onedrive_error=token_exchange_failed");
    }

    const tokens = await tokenResp.json();

    // Pass tokens back to the client via URL fragment (not exposed to server logs)
    const params = new URLSearchParams({
      onedrive_connected: "true",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || "",
      expires_in: String(tokens.expires_in || 3600),
    });

    return redirectToSettings(params.toString());
  } catch (err) {
    console.error("OneDrive callback error:", err);
    return redirectToSettings("onedrive_error=server_error");
  }
}

async function handleOneDriveRefresh(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { clientId, refreshToken } = body;

    if (!clientId || !refreshToken) {
      return Response.json({ error: "Missing clientId or refreshToken" }, { status: 400 });
    }

    const tokenResp = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Files.ReadWrite.AppFolder offline_access",
      }),
    });

    if (!tokenResp.ok) {
      return Response.json({ error: "Refresh failed" }, { status: 502 });
    }

    const tokens = await tokenResp.json();
    return Response.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_in: tokens.expires_in,
    });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

function redirectToSettings(query: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `/settings?${query}` },
  });
}
