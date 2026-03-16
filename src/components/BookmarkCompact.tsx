import { Link } from "react-router-dom";
import { Bookmark, BookmarkActions } from "../types/index.ts";
import { timeAgo, getDomain } from "../utils/format.ts";
import { shareUrl } from "../utils/share.ts";
import { useBookmarkDelete } from "../hooks/useBookmarkDelete.ts";
import { CheckIcon, CircleIcon, ArchiveIcon, ShareIcon, TrashIcon } from "./Icons.tsx";
import { Favicon } from "./Favicon.tsx";
import { BookmarkTags } from "./BookmarkTags.tsx";

const ICON_SIZE = 14;

interface Props extends BookmarkActions {
  bookmark: Bookmark;
}

export function BookmarkCompact({ bookmark, onStatusChange, onDelete }: Props) {
  const handleDelete = useBookmarkDelete(onDelete);

  return (
    <div className={`bookmark-compact ${bookmark.status}`}>
      <Link to={`/view/${bookmark.id}`} className="bookmark-compact-content">
        <div className="bookmark-compact-header">
          <Favicon url={bookmark.url} />
          <span className="bookmark-compact-title">{bookmark.title}</span>
          <span className="bookmark-compact-domain">{getDomain(bookmark.url)}</span>
        </div>
        {bookmark.description && (
          <p className="bookmark-compact-desc">{bookmark.description}</p>
        )}
        <div className="bookmark-compact-meta">
          <span className="bookmark-time">{timeAgo(bookmark.dateAdded)}</span>
          <BookmarkTags tags={bookmark.tags} />
          {bookmark.snapshotAvailable && (
            <span className="snapshot-badge" title="Offline copy available">&#9679;</span>
          )}
        </div>
      </Link>
      <div className="bookmark-compact-actions">
        {bookmark.status === "unread" ? (
          <button className="btn-icon" title="Mark as read" onClick={() => onStatusChange(bookmark.id, "read")}>
            <CheckIcon size={ICON_SIZE} />
          </button>
        ) : (
          <button className="btn-icon" title="Mark as unread" onClick={() => onStatusChange(bookmark.id, "unread")}>
            <CircleIcon size={ICON_SIZE} />
          </button>
        )}
        <button className="btn-icon" title="Archive" onClick={() => onStatusChange(bookmark.id, "archived")}>
          <ArchiveIcon size={ICON_SIZE} />
        </button>
        <button className="btn-icon" title="Share" onClick={() => shareUrl(bookmark.title, bookmark.url)}>
          <ShareIcon size={ICON_SIZE} />
        </button>
        <button className="btn-icon btn-danger" title="Delete" onClick={() => handleDelete(bookmark.id, bookmark.title)}>
          <TrashIcon size={ICON_SIZE} />
        </button>
      </div>
    </div>
  );
}
