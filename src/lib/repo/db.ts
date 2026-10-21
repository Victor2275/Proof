/*
 * The device database.
 *
 * IndexedDB is the source of truth for a person's own cookbook (LAUNCH_PLAN.md,
 * Phase 1). Version 1 of this database held one store, the bake logs saved
 * while offline. Version 2 holds the whole cookbook, and its upgrade carries
 * those offline bake logs across — photographs included, which version 1 kept
 * as data URLs and version 2 keeps as compressed blobs.
 *
 * The name stays "CulinaryLabDB": renaming a database is a new, empty one, and
 * the point of an upgrade path is that nobody loses a bake log to it.
 */

export const DB_NAME = 'CulinaryLabDB';
export const DB_VERSION = 2;

export type StoreName = 'recipes' | 'bakeLogs' | 'photos' | 'pantry' | 'notes' | 'folders' | 'meta';

export const RECORD_STORES = ['recipes', 'bakeLogs', 'pantry', 'notes', 'folders'] as const;
export type RecordStore = (typeof RECORD_STORES)[number];

const LEGACY_STORE = 'localBakeLogs';

let opening: Promise<IDBDatabase> | null = null;

/** Turns a data URL into a Blob without a network round trip. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const type = match[1] || 'application/octet-stream';
  if (!match[2]) return new Blob([decodeURIComponent(match[3])], { type });
  const binary = atob(match[3]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * Moves version 1's offline bake logs into version 2's stores, inside the
 * upgrade transaction so it is all-or-nothing.
 */
function migrateLegacyBakeLogs(tx: IDBTransaction) {
  const legacy = tx.objectStore(LEGACY_STORE);
  const bakeLogs = tx.objectStore('bakeLogs');
  const photos = tx.objectStore('photos');

  legacy.getAll().onsuccess = (event) => {
    const logs = (event.target as IDBRequest).result as Record<string, unknown>[];
    let seq = 0;
    for (const log of logs) {
      const stamp = typeof log.date === 'string' ? log.date : new Date().toISOString();
      // imageUrls and images describe the same photographs, so each data URL is
      // stored once and both lists point at the one blob.
      const converted = new Map<string, string>();
      const convert = (url: string) => {
        if (!url.startsWith('data:')) return url;
        const known = converted.get(url);
        if (known) return known;
        const blob = dataUrlToBlob(url);
        if (!blob) return url;
        const id = `legacy-${String(log._id)}-${seq++}`;
        photos.put({ _id: id, blob, type: blob.type, bytes: blob.size, createdAt: stamp });
        converted.set(url, `photo:${id}`);
        return `photo:${id}`;
      };
      const images = Array.isArray(log.images)
        ? (log.images as { url: string; label: string }[]).map((img) => ({ ...img, url: convert(img.url) }))
        : [];
      const imageUrls = Array.isArray(log.imageUrls) ? (log.imageUrls as string[]).map(convert) : [];
      const recipeId = typeof log.recipeId === 'object' && log.recipeId
        ? String((log.recipeId as { _id: string })._id)
        : String(log.recipeId);
      bakeLogs.put({
        ...log,
        recipeId,
        images,
        imageUrls,
        createdAt: stamp,
        updatedAt: stamp,
        deletedAt: null,
      });
    }
    tx.db.deleteObjectStore(LEGACY_STORE);
  };
}

function upgrade(db: IDBDatabase, tx: IDBTransaction, oldVersion: number) {
  for (const name of RECORD_STORES) {
    if (!db.objectStoreNames.contains(name)) {
      const store = db.createObjectStore(name, { keyPath: '_id' });
      if (name === 'bakeLogs') store.createIndex('recipeId', 'recipeId');
    }
  }
  if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: '_id' });
  if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
  if (oldVersion >= 1 && db.objectStoreNames.contains(LEGACY_STORE)) migrateLegacyBakeLogs(tx);
}

export function openDB(): Promise<IDBDatabase> {
  if (opening) return opening;
  opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      upgrade(request.result, request.transaction!, event.oldVersion);
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema: let it, and reopen next time.
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      opening = null;
      reject(request.error);
    };
    request.onblocked = () => {
      opening = null;
      reject(new Error('Proof is open in another tab with an older version. Close it, then reload.'));
    };
  });
  return opening;
}

/** For tests: forget the cached connection so the next call opens afresh. */
export async function closeDB() {
  if (!opening) return;
  const db = await opening.catch(() => null);
  db?.close();
  opening = null;
}

const asPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('The device database aborted a write.'));
  });

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return asPromise(db.transaction(store, 'readonly').objectStore(store).getAll()) as Promise<T[]>;
}

export async function getOne<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDB();
  return asPromise(db.transaction(store, 'readonly').objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function getByIndex<T>(store: StoreName, index: string, key: string): Promise<T[]> {
  const db = await openDB();
  return asPromise(db.transaction(store, 'readonly').objectStore(store).index(index).getAll(key)) as Promise<T[]>;
}

export async function putMany(store: StoreName, values: unknown[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const v of values) os.put(v);
  await done(tx);
}

export async function putOne(store: StoreName, value: unknown): Promise<void> {
  await putMany(store, [value]);
}

export async function deleteMany(store: StoreName, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const k of keys) os.delete(k);
  await done(tx);
}
