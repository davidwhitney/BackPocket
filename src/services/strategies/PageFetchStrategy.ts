export interface FetchPageResult {
  title: string;
  description: string;
  content: string;
  textContent: string;
}

export interface PageFetchStrategy {
  fetchPage(url: string, signal?: AbortSignal): Promise<FetchPageResult | null>;
}
