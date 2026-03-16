import { useState } from "react";
import { Bookmark, ViewMode } from "../types/index.ts";
import { type BookmarkService } from "../hooks/useBookmarks.ts";
import { BookmarkListView } from "../components/BookmarkListView.tsx";

interface Props {
  bookmarks: BookmarkService;
  viewMode: ViewMode;
}

export function SearchPage({ bookmarks, viewMode }: Props) {
  const [query, setQuery] = useState("");
  const [deepSearch, setDeepSearch] = useState(false);
  const [results, setResults] = useState<Bookmark[] | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const found = await bookmarks.search(query.trim(), deepSearch);
    setResults(found);
    setSearching(false);
  };

  return (
    <div className="search-page">
      <h1>Search</h1>
      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search bookmarks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={searching}>
          {searching ? "..." : "Search"}
        </button>
      </form>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={deepSearch}
          onChange={(e) => setDeepSearch(e.target.checked)}
        />
        <span>Deep search (include cached page content)</span>
      </label>

      {results !== null && (
        <div className="search-results">
          {results.length === 0 ? (
            <p className="empty-state">No results found.</p>
          ) : (
            <>
              <p className="results-count">{results.length} result{results.length !== 1 ? "s" : ""}</p>
              <BookmarkListView
                bookmarks={results}
                viewMode={viewMode}
                onStatusChange={bookmarks.setStatus}
                onDelete={bookmarks.removeBookmark}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
