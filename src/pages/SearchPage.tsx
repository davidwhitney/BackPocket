import { useState } from "react";
import { Bookmark, BookmarkStatus, ViewMode } from "../types/index.ts";
import { BookmarkCard } from "../components/BookmarkCard.tsx";
import { BookmarkRow } from "../components/BookmarkRow.tsx";

interface Props {
  bookmarks: {
    search: (query: string, deep: boolean) => Promise<Bookmark[]>;
    setStatus: (id: string, status: BookmarkStatus) => Promise<void>;
    removeBookmark: (id: string) => Promise<void>;
  };
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

  const Item = viewMode === "list" ? BookmarkRow : BookmarkCard;

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
              <div className={viewMode === "list" ? "bookmark-list-rows" : "bookmark-list"}>
                {results.map((bookmark) => (
                  <Item
                    key={bookmark.id}
                    bookmark={bookmark}
                    onStatusChange={bookmarks.setStatus}
                    onDelete={bookmarks.removeBookmark}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
