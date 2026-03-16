import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { Bookmark, BookmarkStatus, PageSnapshot } from "../types/index.ts";
import { getBookmark, getSnapshot } from "../services/storage.ts";

interface Props {
  bookmarks: {
    updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>;
    setStatus: (id: string, status: BookmarkStatus) => Promise<void>;
    setTags: (id: string, tags: string[]) => Promise<void>;
    removeBookmark: (id: string) => Promise<void>;
  };
}

export function ViewBookmark({ bookmarks }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [snapshot, setSnapshot] = useState<PageSnapshot | null>(null);
  const [viewMode, setViewMode] = useState<"info" | "cached">("info");
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const bm = await getBookmark(id);
    if (!bm) {
      navigate("/");
      return;
    }
    setBookmark(bm);
    const snap = await getSnapshot(id);
    if (snap) setSnapshot(snap);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !bookmark) {
    return <div className="loading">Loading...</div>;
  }

  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || bookmark.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    await bookmarks.setTags(bookmark.id, [...bookmark.tags, tag]);
    setBookmark((prev) => prev ? { ...prev, tags: [...prev.tags, tag] } : prev);
    setTagInput("");
  };

  const handleRemoveTag = async (tag: string) => {
    const newTags = bookmark.tags.filter((t) => t !== tag);
    await bookmarks.setTags(bookmark.id, newTags);
    setBookmark((prev) => prev ? { ...prev, tags: newTags } : prev);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: bookmark.title, url: bookmark.url });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(bookmark.url);
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this bookmark permanently?")) {
      await bookmarks.removeBookmark(bookmark.id);
      navigate("/");
    }
  };

  return (
    <div className="view-page">
      <div className="view-header">
        <button className="btn-icon" onClick={() => navigate("/")}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="view-header-actions">
          <button className="btn-icon" title="Share" onClick={handleShare}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>
      </div>

      <div className="view-info">
        <h1>{bookmark.title}</h1>
        {bookmark.description && <p className="view-description">{bookmark.description}</p>}
        <a href={bookmark.url} className="view-url" target="_blank" rel="noopener noreferrer">
          {bookmark.url}
        </a>
      </div>

      <div className="view-tags">
        {bookmark.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button className="tag-remove" onClick={() => handleRemoveTag(tag)}>
              &times;
            </button>
          </span>
        ))}
        <form
          className="tag-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTag();
          }}
        >
          <input
            type="text"
            className="tag-input"
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
          />
        </form>
      </div>

      <div className="view-actions">
        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary"
          onClick={() => bookmarks.setStatus(bookmark.id, "read")}
        >
          Open Link
        </a>
        {snapshot && (
          <button
            className="btn btn-secondary"
            onClick={() => setViewMode(viewMode === "cached" ? "info" : "cached")}
          >
            {viewMode === "cached" ? "Hide Cached" : "View Cached Copy"}
          </button>
        )}
      </div>

      <div className="view-status-actions">
        {bookmark.status === "unread" && (
          <button className="btn btn-sm" onClick={() => {
            bookmarks.setStatus(bookmark.id, "read");
            setBookmark((prev) => prev ? { ...prev, status: "read" } : prev);
          }}>
            Mark Read
          </button>
        )}
        {bookmark.status === "read" && (
          <button className="btn btn-sm" onClick={() => {
            bookmarks.setStatus(bookmark.id, "unread");
            setBookmark((prev) => prev ? { ...prev, status: "unread" } : prev);
          }}>
            Mark Unread
          </button>
        )}
        <button className="btn btn-sm" onClick={() => {
          bookmarks.setStatus(bookmark.id, "archived");
          navigate("/");
        }}>
          Archive
        </button>
        <button className="btn btn-sm btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>

      {viewMode === "cached" && snapshot && (
        <div className="cached-view">
          <div
            className="cached-content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(snapshot.html, {
                FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
                FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
              }),
            }}
          />
        </div>
      )}
    </div>
  );
}
