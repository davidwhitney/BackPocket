import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "node:fs";
import { fetchAndExtract } from "./api/src/extract-content";

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
    const { extracted, url } = await fetchAndExtract(targetUrl);
    return c.json(
      { ...extracted, url },
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
