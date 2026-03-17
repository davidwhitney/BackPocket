import { Bookmark, BookmarkActions } from "../types/index";
import { shareUrl } from "../utils/share";
import { useBookmarkDelete } from "../hooks/useBookmarkDelete";
import { CheckIcon, CircleIcon, ArchiveIcon, ShareIcon, TrashIcon } from "./Icons";

interface Props extends BookmarkActions {
  bookmark: Bookmark;
  iconSize?: number;
  showShare?: boolean;
}

export function BookmarkActionButtons({
  bookmark,
  onStatusChange,
  onDelete,
  iconSize = 16,
  showShare = false,
}: Props) {
  const handleDelete = useBookmarkDelete(onDelete);

  return (
    <>
      {bookmark.status === "unread" ? (
        <button className="btn-icon" title="Mark as read" onClick={() => onStatusChange(bookmark.id, "read")}>
          <CheckIcon size={iconSize} />
        </button>
      ) : (
        <button className="btn-icon" title="Mark as unread" onClick={() => onStatusChange(bookmark.id, "unread")}>
          <CircleIcon size={iconSize} />
        </button>
      )}
      <button className="btn-icon" title="Archive" onClick={() => onStatusChange(bookmark.id, "archived")}>
        <ArchiveIcon size={iconSize} />
      </button>
      {showShare && (
        <button className="btn-icon" title="Share" onClick={() => shareUrl(bookmark.title, bookmark.url)}>
          <ShareIcon size={iconSize} />
        </button>
      )}
      <button className="btn-icon btn-danger" title="Delete" onClick={() => handleDelete(bookmark.id, bookmark.title)}>
        <TrashIcon size={iconSize} />
      </button>
    </>
  );
}
