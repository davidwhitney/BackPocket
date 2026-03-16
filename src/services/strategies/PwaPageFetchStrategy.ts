import type { PageFetchStrategy, FetchPageResult } from "./PageFetchStrategy.ts";

export class PwaPageFetchStrategy implements PageFetchStrategy {
  async fetchPage(url: string, signal?: AbortSignal): Promise<FetchPageResult | null> {
    try {
      const response = await fetch(
        `/api/fetch-page?url=${encodeURIComponent(url)}`,
        signal ? { signal } : undefined,
      );
      if (!response.ok) return null;
      const data = await response.json();
      return {
        title: data.title || "",
        description: data.description || "",
        content: data.content || "",
        textContent: data.textContent || "",
      };
    } catch {
      return null;
    }
  }
}
