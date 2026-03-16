import { useState, useEffect, useCallback, useRef } from "react";
import { Bookmark, BookmarkStatus } from "../types/index";
import {
  loadIndex,
  addBookmark as storageAdd,
  saveBookmark,
  deleteBookmark as storageDelete,
  searchBookmarks,
} from "../services/storage";

export interface BookmarkService {
  bookmarks: Bookmark[];
  loading: boolean;
  refresh: () => Promise<void>;
  addBookmark: (url: string, title?: string, description?: string) => Promise<Bookmark>;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  setStatus: (id: string, status: BookmarkStatus) => Promise<void>;
  setTags: (id: string, tags: string[]) => Promise<void>;
  search: (query: string, deep?: boolean) => Promise<Bookmark[]>;
}

export function useBookmarks(onDataChanged?: () => void): BookmarkService {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const onDataChangedRef = useRef(onDataChanged);
  onDataChangedRef.current = onDataChanged;

  const refresh = useCallback(async () => {
    const index = await loadIndex();
    setBookmarks(index.bookmarks);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const notifyChanged = useCallback(() => {
    onDataChangedRef.current?.();
  }, []);

  const addBookmark = useCallback(
    async (url: string, title?: string, description?: string) => {
      const bookmark = await storageAdd(url, title, description);
      await refresh();
      notifyChanged();
      return bookmark;
    },
    [refresh, notifyChanged],
  );

  const updateBookmark = useCallback(
    async (id: string, updates: Partial<Bookmark>) => {
      const existing = bookmarks.find((b) => b.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates, dateModified: new Date().toISOString() };
      await saveBookmark(updated);
      await refresh();
      notifyChanged();
    },
    [bookmarks, refresh, notifyChanged],
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      await storageDelete(id);
      await refresh();
      notifyChanged();
    },
    [refresh, notifyChanged],
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

  const search = useCallback((query: string, deep: boolean = false) => {
    return searchBookmarks(query, deep);
  }, []);

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
  };
}
