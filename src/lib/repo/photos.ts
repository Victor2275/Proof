/*
 * Photographs, stored on the device as compressed blobs.
 *
 * A record refers to a stored photograph as `photo:<id>`. Blobs are kept apart
 * from the records that use them so a cover photograph shared by a bake log
 * and its recipe is stored once, and so listing recipes never reads megabytes
 * of image data.
 */
import { compressImage } from '../image';
import { ulid } from '../ulid';
import { deleteMany, getAll, getOne, putOne } from './db';

export interface PhotoRecord {
  _id: string;
  blob: Blob;
  type: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export const PHOTO_PREFIX = 'photo:';

export const isPhotoRef = (ref: string | undefined | null): ref is string =>
  typeof ref === 'string' && ref.startsWith(PHOTO_PREFIX);

export const photoIdOf = (ref: string) => ref.slice(PHOTO_PREFIX.length);

/** Compresses and stores a photograph; returns the reference a record keeps. */
export async function savePhoto(input: Blob): Promise<string> {
  const { blob, width, height } = await compressImage(input);
  const id = ulid();
  const record: PhotoRecord = {
    _id: id,
    blob,
    type: blob.type,
    bytes: blob.size,
    width: width || undefined,
    height: height || undefined,
    createdAt: new Date().toISOString(),
  };
  await putOne('photos', record);
  return PHOTO_PREFIX + id;
}

export async function getPhotoBlob(ref: string): Promise<Blob | undefined> {
  if (!isPhotoRef(ref)) return undefined;
  return (await getOne<PhotoRecord>('photos', photoIdOf(ref)))?.blob;
}

export async function getPhotoRecord(id: string): Promise<PhotoRecord | undefined> {
  return getOne<PhotoRecord>('photos', id);
}

/**
 * Brings a photograph from the web onto the device, so a recipe saved from the
 * shared cookbook still has its picture offline. If the host refuses (no CORS,
 * no network), the web address is kept and the picture loads when it can.
 */
export async function adoptRemotePhoto(url: string): Promise<string> {
  if (isPhotoRef(url) || !/^https?:\/\//.test(url)) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return url;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return url;
    return await savePhoto(blob);
  } catch {
    return url;
  }
}

/** Every stored photograph a live record still points at. */
export function referencedPhotoIds(records: { deletedAt?: string | null; imageUrls?: string[]; images?: { url: string }[] }[]) {
  const ids = new Set<string>();
  for (const r of records) {
    if (r.deletedAt) continue;
    for (const ref of r.imageUrls ?? []) if (isPhotoRef(ref)) ids.add(photoIdOf(ref));
    for (const img of r.images ?? []) if (isPhotoRef(img.url)) ids.add(photoIdOf(img.url));
  }
  return ids;
}

/**
 * Deletes stored photographs no live record uses any more. A photograph saved
 * in the last hour is left alone: it may belong to an editor that has not been
 * saved yet.
 */
export const PHOTO_GRACE_MS = 60 * 60 * 1000;

export async function collectPhotoGarbage(now = Date.now()): Promise<number> {
  const [photos, recipes, bakeLogs] = await Promise.all([
    getAll<PhotoRecord>('photos'),
    getAll<{ deletedAt: string | null; imageUrls?: string[] }>('recipes'),
    getAll<{ deletedAt: string | null; imageUrls?: string[]; images?: { url: string }[] }>('bakeLogs'),
  ]);
  // A record deleted within the grace period may still be undone, and must
  // come back with its photographs.
  const recent = (r: { deletedAt: string | null }) =>
    r.deletedAt && now - new Date(r.deletedAt).getTime() <= PHOTO_GRACE_MS ? { ...r, deletedAt: null } : r;
  const live = referencedPhotoIds([...recipes, ...bakeLogs].map(recent));
  const orphans = photos
    .filter((p) => !live.has(p._id) && now - new Date(p.createdAt).getTime() > PHOTO_GRACE_MS)
    .map((p) => p._id);
  await deleteMany('photos', orphans);
  return orphans.length;
}
