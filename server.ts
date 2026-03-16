import { serveDir } from "jsr:@std/http/file-server";

const PORT = parseInt(Deno.env.get("PORT") || "8000");

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/fetch-page") {
    return handleFetchPage(url);
  }

  // Serve static files from dist/ in production
  const response = await serveDir(req, {
    fsRoot: "dist",
    quiet: true,
  });

  // SPA fallback: serve index.html for non-file routes
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
    const timeout = setTimeout(() => controller.abort(), 10_000);

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

    return Response.json(
      { html, url: targetUrl },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
