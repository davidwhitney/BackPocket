let _dirHandle: FileSystemDirectoryHandle | null = null;

export function isFileSystemAccessSupported(): boolean {
  return "showDirectoryPicker" in window;
}

export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await (window as any).showDirectoryPicker({
      id: "backpocket-sync",
      mode: "readwrite",
      startIn: "documents",
    });
    _dirHandle = handle;
    return handle;
  } catch {
    return null;
  }
}

export async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  if ((await (handle as any).queryPermission(opts)) === "granted") return true;
  if ((await (handle as any).requestPermission(opts)) === "granted") return true;
  return false;
}

export function getDirHandle(): FileSystemDirectoryHandle | null {
  return _dirHandle;
}

// --- Generic file operations ---

async function writeFile(dir: FileSystemDirectoryHandle, filename: string, data: string): Promise<boolean> {
  try {
    const fileHandle = await dir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    return true;
  } catch (err) {
    console.error(`Failed to write ${filename}:`, err);
    return false;
  }
}

async function readFile(dir: FileSystemDirectoryHandle, filename: string): Promise<string | null> {
  try {
    const fileHandle = await dir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function deleteFile(dir: FileSystemDirectoryHandle, filename: string): Promise<void> {
  try {
    await dir.removeEntry(filename);
  } catch {
    // File didn't exist
  }
}

async function listFiles(dir: FileSystemDirectoryHandle, prefix: string): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of (dir as any).values()) {
    if (entry.kind === "file" && entry.name.startsWith(prefix)) {
      names.push(entry.name);
    }
  }
  return names;
}

// --- High-level sync operations ---

import type { BookmarkIndex, PageSnapshot } from "../types/index.ts";

export async function writeIndexToFolder(index: BookmarkIndex): Promise<boolean> {
  const dir = _dirHandle;
  if (!dir || !(await verifyPermission(dir))) return false;
  return writeFile(dir, "index.json", JSON.stringify(index, null, 2));
}

export async function writeSnapshotToFolder(snapshot: PageSnapshot): Promise<boolean> {
  const dir = _dirHandle;
  if (!dir || !(await verifyPermission(dir))) return false;
  return writeFile(dir, `snapshot-${snapshot.id}.json`, JSON.stringify(snapshot));
}

export async function deleteSnapshotFromFolder(id: string): Promise<void> {
  const dir = _dirHandle;
  if (!dir || !(await verifyPermission(dir))) return;
  await deleteFile(dir, `snapshot-${id}.json`);
}

export async function readIndexFromFolder(): Promise<BookmarkIndex | null> {
  const dir = _dirHandle;
  if (!dir || !(await verifyPermission(dir))) return null;
  const data = await readFile(dir, "index.json");
  if (!data) return null;
  try {
    return JSON.parse(data) as BookmarkIndex;
  } catch {
    return null;
  }
}

export async function readSnapshotFromFolder(id: string): Promise<PageSnapshot | null> {
  const dir = _dirHandle;
  if (!dir || !(await verifyPermission(dir))) return null;
  const data = await readFile(dir, `snapshot-${id}.json`);
  if (!data) return null;
  try {
    return JSON.parse(data) as PageSnapshot;
  } catch {
    return null;
  }
}

export async function readAllSnapshotsFromFolder(): Promise<PageSnapshot[]> {
  const dir = _dirHandle;
  if (!dir || !(await verifyPermission(dir))) return [];
  const filenames = await listFiles(dir, "snapshot-");
  const snapshots: PageSnapshot[] = [];
  for (const name of filenames) {
    const data = await readFile(dir, name);
    if (data) {
      try { snapshots.push(JSON.parse(data)); } catch { /* skip corrupt */ }
    }
  }
  return snapshots;
}

// --- Handle persistence (IndexedDB) ---

const IDB_NAME = "backpocket_fshandles";
const IDB_STORE = "handles";

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDb();
  const tx = db.transaction(IDB_STORE, "readwrite");
  tx.objectStore(IDB_STORE).put(handle, "sync-dir");
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function restoreHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb();
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get("sync-dir");
    const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (!handle) return null;
    if (await verifyPermission(handle)) {
      _dirHandle = handle;
      return handle;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearHandle(): Promise<void> {
  _dirHandle = null;
  try {
    const db = await openHandleDb();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete("sync-dir");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
