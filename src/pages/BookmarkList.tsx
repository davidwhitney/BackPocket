import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkStatus, ViewMode } from "../types/index.ts";
import { BookmarkCard } from "../components/BookmarkCard.tsx";
import { BookmarkRow } from "../components/BookmarkRow.tsx";

interface Props {
  bookmarks: {
    bookmarks: Bookmark[];
    loading: boolean;
    setStatus: (id: string, status: BookmarkStatus) => Promise<void>;
    removeBookmark: (id: string) => Promise<void>;
    filterByTags: (tags: string[]) => Bookmark[];
  };
  viewMode: ViewMode;
}

type Filter = "all" | "unread" | "read";

export function BookmarkList({ bookmarks: bm, viewMode }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  const Item = viewMode === "list" ? BookmarkRow : BookmarkCard;

  return (
    <div className="bookmark-list-page">
      <div className="list-header">
        <h1>Bookmarks</h1>
        <Link to="/add" className="btn btn-primary btn-sm">
          + Add
        </Link>
      </div>

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

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No bookmarks yet.</p>
          <Link to="/add" className="btn btn-primary">
            Add your first bookmark
          </Link>
        </div>
      ) : (
        <div className={viewMode === "list" ? "bookmark-list-rows" : "bookmark-list"}>
          {filtered.map((bookmark) => (
            <Item
              key={bookmark.id}
              bookmark={bookmark}
              onStatusChange={bm.setStatus}
              onDelete={bm.removeBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
