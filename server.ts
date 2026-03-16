import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const PORT = parseInt(process.env.PORT || "8000");

const app = new Hono();

// --- API routes ---

app.get("/api/fetch-page", async (c) => {
  const targetUrl = c.req.query("url");
  if (!targetUrl) {
    return c.json({ error: "Missing ?url= parameter" }, 400);
  }

  try {
    new URL(targetUrl);
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Pockt/1.0; +https://github.com/pockt)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return c.json({ error: `Upstream returned ${response.status}` }, 502);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return c.json({ error: "Not an HTML page" }, 422);
    }

    const html = await response.text();
    const extracted = extractArticleContent(html);

    return c.json(
      { ...extracted, url: targetUrl },
      200,
      { "Cache-Control": "public, max-age=300" },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return c.json({ error: message }, 502);
  }
});

// --- Static files (production) ---

app.use("/*", serveStatic({ root: "./dist" }));

// SPA fallback
app.get("*", (c) => {
  try {
    const html = readFileSync("dist/index.html", "utf-8");
    return c.html(html);
  } catch {
    return c.text("Not found", 404);
  }
});

// --- Start server ---

console.log(`Pockt server running on http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });

// ============================================================
// Content extraction
// ============================================================

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

function extractArticleContent(html: string): {
  html: string;
  title: string;
  description: string;
  content: string;
  textContent: string;
} {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const title = doc.querySelector("title")?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() || "";
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() || "";

  for (const el of doc.querySelectorAll(REMOVE_SELECTORS)) {
    el.remove();
  }

  let articleEl: Element | null = null;
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
