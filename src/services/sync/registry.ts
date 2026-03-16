import type { StorageProvider } from "../../types/index.ts";
import type { ExternalStorageProvider } from "./ExternalStorageProvider.ts";
import { FolderStorageProvider } from "./FolderStorageProvider.ts";
import { OneDriveStorageProvider } from "./OneDriveStorageProvider.ts";

const providers: Partial<Record<StorageProvider, ExternalStorageProvider>> = {
  folder: new FolderStorageProvider(),
  onedrive: new OneDriveStorageProvider(),
};

export function getExternalProvider(type: StorageProvider): ExternalStorageProvider | null {
  return providers[type] ?? null;
}
