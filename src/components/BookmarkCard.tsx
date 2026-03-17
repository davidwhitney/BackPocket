import { Link } from "react-router-dom";
import { Bookmark, BookmarkActions } from "../types/index";
import { timeAgo, getDomain } from "../utils/format";
import { Favicon } from "./Favicon";
import { BookmarkTags } from "./BookmarkTags";
import { BookmarkActionButtons } from "./BookmarkActionButtons";

interface Props extends BookmarkActions {
  bookmark: Bookmark;
}

export function BookmarkCard({ bookmark, onStatusChange, onDelete }: Props) {
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
        <BookmarkActionButtons bookmark={bookmark} onStatusChange={onStatusChange} onDelete={onDelete} showShare />
      </div>
    </div>
  );
}
