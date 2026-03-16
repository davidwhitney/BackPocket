import { useState, useRef, useEffect, useCallback } from "react";
import { fetchPageMetadata } from "../services/storage.ts";
import { METADATA_DEBOUNCE_MS } from "../constants.ts";
import { useDebouncedRef } from "./useDebounce.ts";

interface MetadataFetchResult {
  fetching: boolean;
  fetchMeta: (url: string) => void;
  scheduleFetch: (url: string) => void;
  cancel: () => void;
}

export function useMetadataFetch(
  onResult: (meta: { title: string; description: string }) => void,
): MetadataFetchResult {
  const [fetching, setFetching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastUrlRef = useRef("");
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const { schedule, cancel } = useDebouncedRef(METADATA_DEBOUNCE_MS);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const fetchMeta = useCallback((url: string) => {
    if (url === lastUrlRef.current) return;
    lastUrlRef.current = url;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setFetching(true);
    fetchPageMetadata(url, controller.signal)
      .then((meta) => {
        if (controller.signal.aborted) return;
        if (meta) onResultRef.current(meta);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false);
      });
  }, []);

  const scheduleFetch = useCallback((url: string) => {
    try {
      new URL(url);
    } catch {
      return;
    }
    schedule(() => fetchMeta(url));
  }, [fetchMeta, schedule]);

  return { fetching, fetchMeta, scheduleFetch, cancel };
}
