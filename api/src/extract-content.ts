import { JSDOM } from "jsdom";

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

export interface ExtractedContent {
  html: string;
  title: string;
  description: string;
  content: string;
  textContent: string;
}

export function extractArticleContent(html: string): ExtractedContent {
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

export async function fetchAndExtract(targetUrl: string): Promise<{ extracted: ExtractedContent; url: string }> {
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
    throw new Error(`Upstream returned ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("Not an HTML page");
  }

  const html = await response.text();
  return { extracted: extractArticleContent(html), url: targetUrl };
}
