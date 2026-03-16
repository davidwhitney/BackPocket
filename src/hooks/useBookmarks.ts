import { useState, useEffect, useCallback } from "react";
import { Bookmark, BookmarkStatus } from "../types/index.ts";
import {
  loadIndex,
  addBookmark as storageAdd,
  saveBookmark,
  deleteBookmark as storageDelete,
  searchBookmarks,
} from "../services/storage.ts";

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

export function useBookmarks(): BookmarkService {
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
