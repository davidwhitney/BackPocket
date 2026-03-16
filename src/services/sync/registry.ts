import type { StorageProvider } from "../../types/index";
import type { ExternalStorageProvider } from "./ExternalStorageProvider";
import { FolderStorageProvider } from "./FolderStorageProvider";
import { OneDriveStorageProvider } from "./OneDriveStorageProvider";

const providers: Partial<Record<StorageProvider, ExternalStorageProvider>> = {
  folder: new FolderStorageProvider(),
  onedrive: new OneDriveStorageProvider(),
};

export function getExternalProvider(type: StorageProvider): ExternalStorageProvider | null {
  return providers[type] ?? null;
}
