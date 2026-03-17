import { Link } from "react-router-dom";
import { Bookmark, BookmarkActions } from "../types/index";
import { timeAgo, getDomain } from "../utils/format";
import { Favicon } from "./Favicon";
import { BookmarkTags } from "./BookmarkTags";
import { BookmarkActionButtons } from "./BookmarkActionButtons";

interface Props extends BookmarkActions {
  bookmark: Bookmark;
}

export function BookmarkCompact({ bookmark, onStatusChange, onDelete }: Props) {
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
        <BookmarkActionButtons bookmark={bookmark} onStatusChange={onStatusChange} onDelete={onDelete} iconSize={14} showShare />
      </div>
    </div>
  );
}
