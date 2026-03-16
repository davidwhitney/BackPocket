import { Bookmark, BookmarkActions, ViewMode } from "../types/index.ts";
import { BookmarkCard } from "./BookmarkCard.tsx";
import { BookmarkRow } from "./BookmarkRow.tsx";

interface Props extends BookmarkActions {
  bookmarks: Bookmark[];
  viewMode: ViewMode;
}

export function BookmarkListView({ bookmarks, viewMode, onStatusChange, onDelete }: Props) {
  const Item = viewMode === "list" ? BookmarkRow : BookmarkCard;
  return (
    <div className={viewMode === "list" ? "bookmark-list-rows" : "bookmark-list"}>
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
