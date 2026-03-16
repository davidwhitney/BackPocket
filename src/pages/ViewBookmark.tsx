import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { Bookmark, BookmarkStatus, PageSnapshot } from "../types/index.ts";
import { getBookmark, getSnapshot } from "../services/storage.ts";
import { shareUrl } from "../utils/share.ts";
import { ArrowLeftIcon, ShareIcon } from "../components/Icons.tsx";
import { useConfirm } from "../hooks/useConfirm.ts";

interface Props {
  bookmarks: {
    setStatus: (id: string, status: BookmarkStatus) => Promise<void>;
    setTags: (id: string, tags: string[]) => Promise<void>;
    removeBookmark: (id: string) => Promise<void>;
  };
}

export function ViewBookmark({ bookmarks }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
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

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete bookmark",
      message: `Delete "${bookmark.title}" permanently?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) {
      await bookmarks.removeBookmark(bookmark.id);
      navigate("/");
    }
  };

  const updateLocalStatus = (status: BookmarkStatus) => {
    bookmarks.setStatus(bookmark.id, status);
    setBookmark((prev) => prev ? { ...prev, status } : prev);
  };

  return (
    <div className="view-page">
      <div className="view-header">
        <button className="btn-icon" onClick={() => navigate("/")}>
          <ArrowLeftIcon />
        </button>
        <div className="view-header-actions">
          <button className="btn-icon" title="Share" onClick={() => shareUrl(bookmark.title, bookmark.url)}>
            <ShareIcon size={18} />
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
        {bookmark.status !== "read" && (
          <button className="btn btn-sm" onClick={() => updateLocalStatus("read")}>
            Mark Read
          </button>
        )}
        {bookmark.status !== "unread" && (
          <button className="btn btn-sm" onClick={() => updateLocalStatus("unread")}>
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
