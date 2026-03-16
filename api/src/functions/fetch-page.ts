import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { fetchAndExtract } from "../extract-content";

app.http("fetch-page", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "fetch-page",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const targetUrl = request.query.get("url");
    if (!targetUrl) {
      return { status: 400, jsonBody: { error: "Missing ?url= parameter" } };
    }

    try {
      new URL(targetUrl);
    } catch {
      return { status: 400, jsonBody: { error: "Invalid URL" } };
    }

    try {
      const { extracted, url } = await fetchAndExtract(targetUrl);
      return {
        status: 200,
        jsonBody: { ...extracted, url },
        headers: { "Cache-Control": "public, max-age=300" },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fetch failed";
      return { status: 502, jsonBody: { error: message } };
    }
  },
});
