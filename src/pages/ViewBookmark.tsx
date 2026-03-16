import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { Bookmark, BookmarkStatus, PageSnapshot } from "../types/index.ts";
import { getBookmark, getSnapshot } from "../services/storage.ts";
import { shareUrl } from "../utils/share.ts";
import { ArrowLeftIcon, ShareIcon } from "../components/Icons.tsx";
import { useBookmarkDelete } from "../hooks/useBookmarkDelete.ts";

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
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [snapshot, setSnapshot] = useState<PageSnapshot | null>(null);
  const [readerMode, setReaderMode] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);

  const confirmDelete = useBookmarkDelete(async (deleteId) => {
    await bookmarks.removeBookmark(deleteId);
    navigate("/");
  });

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

  const updateLocalStatus = (status: BookmarkStatus) => {
    bookmarks.setStatus(bookmark.id, status);
    setBookmark((prev) => prev ? { ...prev, status } : prev);
  };

  // --- Reader mode ---
  if (readerMode && snapshot) {
    return (
      <div className="reader-view">
        <div className="reader-header">
          <button className="btn-icon" onClick={() => setReaderMode(false)}>
            <ArrowLeftIcon />
          </button>
          <span className="reader-label">Reader View</span>
          <button className="btn-icon" title="Share" onClick={() => shareUrl(bookmark.title, bookmark.url)}>
            <ShareIcon size={18} />
          </button>
        </div>
        <article className="reader-content">
          <h1 className="reader-title">{bookmark.title}</h1>
          <a href={bookmark.url} className="reader-source" target="_blank" rel="noopener noreferrer">
            {bookmark.url}
          </a>
          <div
            className="reader-body"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(snapshot.content, {
                FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
                FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
              }),
            }}
          />
        </article>
      </div>
    );
  }

  // --- Normal view ---
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
          <button className="btn btn-secondary" onClick={() => setReaderMode(true)}>
            Reader View
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
        <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(bookmark.id, bookmark.title)}>
          Delete
        </button>
      </div>
    </div>
  );
}
