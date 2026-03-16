import { useState, useCallback } from "react";
import { Bookmark } from "../types/index";
import { useDebounce } from "./useDebounce";
import { SEARCH_DEBOUNCE_MS } from "../constants";

interface BookmarkSearchResult {
  query: string;
  setQuery: (value: string) => void;
  deepSearch: boolean;
  setDeepSearch: (value: boolean) => void;
  results: Bookmark[] | null;
  searching: boolean;
  isActive: boolean;
}

export function useBookmarkSearch(
  searchFn: (query: string, deep: boolean) => Promise<Bookmark[]>,
): BookmarkSearchResult {
  const [query, setQueryState] = useState("");
  const [deepSearch, setDeepSearchState] = useState(true);
  const [results, setResults] = useState<Bookmark[] | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async (q: string, deep: boolean) => {
    if (!q.trim()) {
      setResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const found = await searchFn(q.trim(), deep);

    setResults(found);
    setSearching(false);
  }, [searchFn]);

  const debouncedSearch = useDebounce(
    (q: string, deep: boolean) => runSearch(q, deep),
    SEARCH_DEBOUNCE_MS,
  );

  const setQuery = useCallback((value: string) => {
    setQueryState(value);

    if (!value.trim()) {
      setResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    debouncedSearch(value, deepSearch);
  }, [deepSearch, debouncedSearch]);

  const setDeepSearch = useCallback((value: boolean) => {
    setDeepSearchState(value);
    
    if (query.trim()) {
      runSearch(query, value);
    }
  }, [query, runSearch]);

  return {
    query,
    setQuery,
    deepSearch,
    setDeepSearch,
    results,
    searching,
    isActive: results !== null,
  };
}
