import { serveDir } from "jsr:@std/http/file-server";
import { DOMParser } from "jsr:@b-fuze/deno-dom";

const PORT = parseInt(Deno.env.get("PORT") || "8000");

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/fetch-page") {
    return handleFetchPage(url);
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
    const timeout = setTimeout(() => controller.abort(), 10000);

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

// Selectors for elements that are definitely not article content
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

// Selectors that likely contain the main article content, in priority order
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

  // Extract metadata
  const title = doc.querySelector("title")?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() || "";
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() || "";

  // Remove noise elements
  for (const el of doc.querySelectorAll(REMOVE_SELECTORS)) {
    el.remove();
  }

  // Try to find the article container
  let articleEl = null;
  for (const selector of ARTICLE_SELECTORS) {
    articleEl = doc.querySelector(selector);
    if (articleEl) break;
  }

  // Fall back to body
  const contentRoot = articleEl || doc.body;
  if (!contentRoot) {
    return { html, title, description, content: "", textContent: "" };
  }

  // Clean up the content further
  for (const el of contentRoot.querySelectorAll(REMOVE_SELECTORS)) {
    el.remove();
  }

  // Remove hidden elements
  for (const el of contentRoot.querySelectorAll("[hidden], [aria-hidden='true'], .hidden, .visually-hidden, .sr-only")) {
    el.remove();
  }

  // Remove empty divs/spans that are just wrappers
  for (const el of contentRoot.querySelectorAll("div, span")) {
    if (!el.textContent?.trim() && !el.querySelector("img, video, picture, figure, svg")) {
      el.remove();
    }
  }

  const content = contentRoot.innerHTML || "";
  const textContent = contentRoot.textContent || "";

  return { html, title, description, content, textContent };
}
