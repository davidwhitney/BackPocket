export type BookmarkStatus = 'unread' | 'read' | 'archived';

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  status: BookmarkStatus;
  dateAdded: string;
  dateModified: string;
  snapshotAvailable: boolean;
}

export interface BookmarkIndex {
  version: number;
  bookmarks: Bookmark[];
}

export interface PageSnapshot {
  id: string;
  html: string;
  textContent: string;
  fetchedAt: string;
}

export type StorageProvider = 'local' | 'onedrive' | 'icloud' | 'dropbox';
export type ViewMode = 'card' | 'list';

export interface AppConfig {
  storageProvider: StorageProvider;
  darkMode: boolean | 'system';
  viewMode: ViewMode;
  onedrive?: { accessToken: string; refreshToken: string; clientId: string };
  dropbox?: { accessToken: string; refreshToken: string; clientId: string };
  icloud?: { accessToken: string };
  lastSync?: string;
}

export interface BookmarkActions {
  onStatusChange: (id: string, status: BookmarkStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const DEFAULT_CONFIG: AppConfig = {
  storageProvider: 'local',
  darkMode: 'system',
  viewMode: 'card',
};
