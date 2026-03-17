import { Link } from "react-router-dom";
import { Bookmark, BookmarkActions } from "../types/index";
import { timeAgo, getDomain } from "../utils/format";
import { Favicon } from "./Favicon";
import { BookmarkTags } from "./BookmarkTags";
import { BookmarkActionButtons } from "./BookmarkActionButtons";

interface Props extends BookmarkActions {
  bookmark: Bookmark;
}

export function BookmarkRow({ bookmark, onStatusChange, onDelete }: Props) {
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
        <BookmarkActionButtons bookmark={bookmark} onStatusChange={onStatusChange} onDelete={onDelete} iconSize={14} />
      </div>
    </div>
  );
}
