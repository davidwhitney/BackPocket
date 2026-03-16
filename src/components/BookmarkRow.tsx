import { Link } from "react-router-dom";
import { Bookmark, BookmarkActions } from "../types/index";
import { timeAgo, getDomain } from "../utils/format";
import { useBookmarkDelete } from "../hooks/useBookmarkDelete";
import { CheckIcon, CircleIcon, ArchiveIcon, TrashIcon } from "./Icons";
import { Favicon } from "./Favicon";
import { BookmarkTags } from "./BookmarkTags";

const ICON_SIZE = 14;

interface Props extends BookmarkActions {
  bookmark: Bookmark;
}

export function BookmarkRow({ bookmark, onStatusChange, onDelete }: Props) {
  const handleDelete = useBookmarkDelete(onDelete);

  return (
    <div className={`bookmark-row ${bookmark.status}`}>
      <Favicon url={bookmark.url} />
      <Link to={`/view/${bookmark.id}`} className="bookmark-row-content">
        <div className="bookmark-row-main">
          <span className="bookmark-row-title">{bookmark.title}</span>
          <span className="bookmark-row-domain">{getDomain(bookmark.url)}</span>
        </div>
        <div className="bookmark-row-meta">
          <BookmarkTags tags={bookmark.tags} className="bookmark-row-tags" />
          {bookmark.snapshotAvailable && (
            <span className="snapshot-badge" title="Offline copy available">&#9679;</span>
          )}
          <span className="bookmark-time">{timeAgo(bookmark.dateAdded)}</span>
        </div>
      </Link>
      <div className="bookmark-row-actions">
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
        <button className="btn-icon btn-danger" title="Delete" onClick={() => handleDelete(bookmark.id, bookmark.title)}>
          <TrashIcon size={ICON_SIZE} />
        </button>
      </div>
    </div>
  );
}
