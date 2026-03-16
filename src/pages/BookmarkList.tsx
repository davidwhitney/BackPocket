import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bookmark, ViewMode } from "../types/index.ts";
import { type BookmarkService } from "../hooks/useBookmarks.ts";
import { BookmarkListView } from "../components/BookmarkListView.tsx";
import { SEARCH_DEBOUNCE_MS } from "../constants.ts";

interface Props {
  bookmarks: BookmarkService;
  viewMode: ViewMode;
}

type Filter = "all" | "unread" | "read";

export function BookmarkList({ bookmarks: bm, viewMode }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [deepSearch, setDeepSearch] = useState(true);
  const [searchResults, setSearchResults] = useState<Bookmark[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string, deep: boolean) => {
    if (!q.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const results = await bm.search(q.trim(), deep);
    setSearchResults(results);
    setSearching(false);
  }, [bm]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => runSearch(value, deepSearch), SEARCH_DEBOUNCE_MS);
  }, [deepSearch, runSearch]);

  // Re-run search when deep search is toggled
  useEffect(() => {
    if (query.trim()) {
      runSearch(query, deepSearch);
    }
  }, [deepSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    bm.bookmarks.forEach((b) => b.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [bm.bookmarks]);

  const filtered = useMemo(() => {
    let items = bm.bookmarks.filter((b) => b.status !== "archived");

    if (filter === "unread") items = items.filter((b) => b.status === "unread");
    if (filter === "read") items = items.filter((b) => b.status === "read");

    if (selectedTags.length > 0) {
      items = items.filter((b) => selectedTags.every((t) => b.tags.includes(t)));
    }

    return items.sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
    );
  }, [bm.bookmarks, filter, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  if (bm.loading) {
    return <div className="loading">Loading bookmarks...</div>;
  }

  const isSearching = searchResults !== null;
  const displayItems = isSearching ? searchResults : filtered;

  return (
    <div className="bookmark-list-page">
      <div className="list-header">
        <h1>Bookmarks</h1>
        <Link to="/add" className="btn btn-primary btn-sm">
          + Add
        </Link>
      </div>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search bookmarks..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        {isSearching && (
          <label className="checkbox-label checkbox-inline">
            <input
              type="checkbox"
              checked={deepSearch}
              onChange={(e) => setDeepSearch(e.target.checked)}
            />
            <span>Deep search</span>
          </label>
        )}
      </div>

      {!isSearching && (
        <>
          <div className="filter-bar">
            <div className="filter-tabs">
              {(["all", "unread", "read"] as Filter[]).map((f) => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="tag-filter">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag ${selectedTags.includes(tag) ? "tag-active" : ""}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button className="tag tag-clear" onClick={() => setSelectedTags([])}>
                  Clear
                </button>
              )}
            </div>
          )}
        </>
      )}

      {isSearching && (
        <p className="results-count">
          {searching ? "Searching..." : `${displayItems.length} result${displayItems.length !== 1 ? "s" : ""}`}
        </p>
      )}

      {displayItems.length === 0 ? (
        <div className="empty-state">
          {isSearching ? (
            <p>{searching ? "" : "No results found."}</p>
          ) : (
            <>
              <p>No bookmarks yet.</p>
              <Link to="/add" className="btn btn-primary">
                Add your first bookmark
              </Link>
            </>
          )}
        </div>
      ) : (
        <BookmarkListView
          bookmarks={displayItems}
          viewMode={viewMode}
          onStatusChange={bm.setStatus}
          onDelete={bm.removeBookmark}
        />
      )}
    </div>
  );
}
