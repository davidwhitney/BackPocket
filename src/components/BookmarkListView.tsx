import { Bookmark, BookmarkActions, ViewMode } from "../types/index";
import { BookmarkCard } from "./BookmarkCard";
import { BookmarkCompact } from "./BookmarkCompact";
import { BookmarkRow } from "./BookmarkRow";

interface Props extends BookmarkActions {
  bookmarks: Bookmark[];
  viewMode: ViewMode;
}

const VIEW_CONFIG = {
  card: { component: BookmarkCard, className: "bookmark-list" },
  compact: { component: BookmarkCompact, className: "bookmark-list-compact" },
  list: { component: BookmarkRow, className: "bookmark-list-rows" },
} as const;

export function BookmarkListView({ bookmarks, viewMode, onStatusChange, onDelete }: Props) {
  const { component: Item, className } = VIEW_CONFIG[viewMode];
  return (
    <div className={className}>
      {bookmarks.map((bookmark) => (
        <Item
          key={bookmark.id}
          bookmark={bookmark}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
