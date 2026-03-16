import { Link } from "react-router-dom";
import { Bookmark, BookmarkStatus } from "../types/index.ts";

interface Props {
  bookmark: Bookmark;
  onStatusChange: (id: string, status: BookmarkStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function BookmarkCard({ bookmark, onStatusChange, onDelete }: Props) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: bookmark.title, url: bookmark.url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(bookmark.url);
    }
  };

  return (
    <div className={`bookmark-card ${bookmark.status}`}>
      <Link to={`/view/${bookmark.id}`} className="bookmark-card-content">
        <div className="bookmark-card-header">
          <h3 className="bookmark-title">{bookmark.title}</h3>
          <span className="bookmark-domain">{getDomain(bookmark.url)}</span>
        </div>
        {bookmark.description && (
          <p className="bookmark-description">{bookmark.description}</p>
        )}
        <div className="bookmark-meta">
          <span className="bookmark-time">{timeAgo(bookmark.dateAdded)}</span>
          {bookmark.tags.length > 0 && (
            <span className="bookmark-tags">
              {bookmark.tags.map((t) => (
                <span key={t} className="tag tag-sm">
                  {t}
                </span>
              ))}
            </span>
          )}
          {bookmark.snapshotAvailable && (
            <span className="snapshot-badge" title="Offline copy available">
              &#9679;
            </span>
          )}
        </div>
      </Link>
      <div className="bookmark-card-actions">
        {bookmark.status === "unread" ? (
          <button
            className="btn-icon"
            title="Mark as read"
            onClick={() => onStatusChange(bookmark.id, "read")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        ) : (
          <button
            className="btn-icon"
            title="Mark as unread"
            onClick={() => onStatusChange(bookmark.id, "unread")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </button>
        )}
        <button
          className="btn-icon"
          title="Archive"
          onClick={() => onStatusChange(bookmark.id, "archived")}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        </button>
        <button className="btn-icon" title="Share" onClick={handleShare}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        <button
          className="btn-icon btn-danger"
          title="Delete"
          onClick={() => {
            if (confirm("Delete this bookmark permanently?")) {
              onDelete(bookmark.id);
            }
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
