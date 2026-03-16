import { useState, useEffect, useCallback } from "react";
import { Bookmark, BookmarkStatus } from "../types/index.ts";
import {
  loadIndex,
  addBookmark as storageAdd,
  saveBookmark,
  deleteBookmark as storageDelete,
  searchBookmarks,
} from "../services/storage.ts";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const index = await loadIndex();
    setBookmarks(index.bookmarks);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBookmark = useCallback(
    async (url: string, title?: string, description?: string) => {
      const bookmark = await storageAdd(url, title, description);
      await refresh();
      return bookmark;
    },
    [refresh],
  );

  const updateBookmark = useCallback(
    async (id: string, updates: Partial<Bookmark>) => {
      const existing = bookmarks.find((b) => b.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates, dateModified: new Date().toISOString() };
      await saveBookmark(updated);
      await refresh();
    },
    [bookmarks, refresh],
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      await storageDelete(id);
      await refresh();
    },
    [refresh],
  );

  const setStatus = useCallback(
    async (id: string, status: BookmarkStatus) => {
      await updateBookmark(id, { status });
    },
    [updateBookmark],
  );

  const setTags = useCallback(
    async (id: string, tags: string[]) => {
      await updateBookmark(id, { tags });
    },
    [updateBookmark],
  );

  const search = useCallback(async (query: string, deep: boolean = false) => {
    return searchBookmarks(query, deep);
  }, []);

  const filterByTags = useCallback(
    (tags: string[]) => {
      if (tags.length === 0) return bookmarks;
      return bookmarks.filter((b) => tags.every((t) => b.tags.includes(t)));
    },
    [bookmarks],
  );

  return {
    bookmarks,
    loading,
    refresh,
    addBookmark,
    updateBookmark,
    removeBookmark,
    setStatus,
    setTags,
    search,
    filterByTags,
  };
}
