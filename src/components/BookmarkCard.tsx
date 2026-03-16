import { Link } from "react-router-dom";
import { Bookmark, BookmarkActions } from "../types/index";
import { timeAgo, getDomain } from "../utils/format";
import { shareUrl } from "../utils/share";
import { useBookmarkDelete } from "../hooks/useBookmarkDelete";
import { CheckIcon, CircleIcon, ArchiveIcon, ShareIcon, TrashIcon } from "./Icons";
import { Favicon } from "./Favicon";
import { BookmarkTags } from "./BookmarkTags";

interface Props extends BookmarkActions {
  bookmark: Bookmark;
}

export function BookmarkCard({ bookmark, onStatusChange, onDelete }: Props) {
  const handleDelete = useBookmarkDelete(onDelete);

  return (
    <div className={`bookmark-card ${bookmark.status}`}>
      <Link to={`/view/${bookmark.id}`} className="bookmark-card-content">
        <div className="bookmark-card-header">
          <Favicon url={bookmark.url} />
          <h3 className="bookmark-title">{bookmark.title}</h3>
          <span className="bookmark-domain">{getDomain(bookmark.url)}</span>
        </div>
        {bookmark.description && (
          <p className="bookmark-description">{bookmark.description}</p>
        )}
        <div className="bookmark-meta">
          <span className="bookmark-time">{timeAgo(bookmark.dateAdded)}</span>
          <BookmarkTags tags={bookmark.tags} />
          {bookmark.snapshotAvailable && (
            <span className="snapshot-badge" title="Offline copy available">&#9679;</span>
          )}
        </div>
      </Link>
      <div className="bookmark-card-actions">
        {bookmark.status === "unread" ? (
          <button className="btn-icon" title="Mark as read" onClick={() => onStatusChange(bookmark.id, "read")}>
            <CheckIcon />
          </button>
        ) : (
          <button className="btn-icon" title="Mark as unread" onClick={() => onStatusChange(bookmark.id, "unread")}>
            <CircleIcon />
          </button>
        )}
        <button className="btn-icon" title="Archive" onClick={() => onStatusChange(bookmark.id, "archived")}>
          <ArchiveIcon />
        </button>
        <button className="btn-icon" title="Share" onClick={() => shareUrl(bookmark.title, bookmark.url)}>
          <ShareIcon />
        </button>
        <button className="btn-icon btn-danger" title="Delete" onClick={() => handleDelete(bookmark.id, bookmark.title)}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
