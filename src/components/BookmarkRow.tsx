import { Link } from "react-router-dom";
import { Bookmark, BookmarkActions } from "../types/index.ts";
import { timeAgo, getDomain } from "../utils/format.ts";
import { CheckIcon, CircleIcon, ArchiveIcon, TrashIcon } from "./Icons.tsx";

interface Props extends BookmarkActions {
  bookmark: Bookmark;
}

export function BookmarkRow({ bookmark, onStatusChange, onDelete }: Props) {
  return (
    <div className={`bookmark-row ${bookmark.status}`}>
      <Link to={`/view/${bookmark.id}`} className="bookmark-row-content">
        <div className="bookmark-row-main">
          <span className="bookmark-row-title">{bookmark.title}</span>
          <span className="bookmark-row-domain">{getDomain(bookmark.url)}</span>
        </div>
        <div className="bookmark-row-meta">
          {bookmark.tags.length > 0 && (
            <span className="bookmark-row-tags">
              {bookmark.tags.map((t) => (
                <span key={t} className="tag tag-sm">{t}</span>
              ))}
            </span>
          )}
          {bookmark.snapshotAvailable && (
            <span className="snapshot-badge" title="Offline copy available">&#9679;</span>
          )}
          <span className="bookmark-time">{timeAgo(bookmark.dateAdded)}</span>
        </div>
      </Link>
      <div className="bookmark-row-actions">
        {bookmark.status === "unread" ? (
          <button className="btn-icon" title="Mark as read" onClick={() => onStatusChange(bookmark.id, "read")}>
            <CheckIcon size={14} />
          </button>
        ) : (
          <button className="btn-icon" title="Mark as unread" onClick={() => onStatusChange(bookmark.id, "unread")}>
            <CircleIcon size={14} />
          </button>
        )}
        <button className="btn-icon" title="Archive" onClick={() => onStatusChange(bookmark.id, "archived")}>
          <ArchiveIcon size={14} />
        </button>
        <button
          className="btn-icon btn-danger"
          title="Delete"
          onClick={() => { if (confirm("Delete this bookmark permanently?")) onDelete(bookmark.id); }}
        >
          <TrashIcon size={14} />
        </button>
      </div>
    </div>
  );
}
