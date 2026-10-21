/*
 * Export and import: the whole cookbook as one .zip.
 *
 * This is the free tier's backup, the GDPR export, and the insurance against
 * any later sync bug (LAUNCH_PLAN.md, Phase 1 item 7). The archive holds one
 * JSON file per record type and the photographs as their own image files, so
 * it is readable without Proof.
 *
 * Import merges rather than replaces: each record is kept if the device has
 * nothing newer, by `updatedAt`. Importing the same file twice changes nothing,
 * and importing an old backup can't overwrite a recipe edited since.
 * Tombstones travel too, so a deletion survives a round trip.
 */
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { RecordFields } from '../types';
import { getAll, getOne, putMany, putOne, RECORD_STORES, type RecordStore } from './db';
import type { PhotoRecord } from './photos';

export const BACKUP_FORMAT = 'proof-cookbook';
export const BACKUP_VERSION = 1;

interface Manifest {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
}

interface PhotoEntry {
  _id: string;
  type: string;
  file: string;
  width?: number;
  height?: number;
  createdAt: string;
}

const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
};

export interface ImportResult {
  added: number;
  updated: number;
  unchanged: number;
  photos: number;
}

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupFormatError';
  }
}

export async function exportCookbook(): Promise<Blob> {
  const files: Zippable = {};
  const counts: Record<string, number> = {};

  for (const store of RECORD_STORES) {
    const rows = await getAll<RecordFields>(store);
    counts[store] = rows.filter((r) => !r.deletedAt).length;
    files[`${store}.json`] = strToU8(JSON.stringify(rows, null, 2));
  }

  const photos = await getAll<PhotoRecord>('photos');
  const index: PhotoEntry[] = [];
  for (const p of photos) {
    const file = `photos/${p._id}.${EXTENSIONS[p.type] ?? 'bin'}`;
    // Photographs are already compressed; zipping them again only costs time.
    files[file] = [new Uint8Array(await p.blob.arrayBuffer()), { level: 0 }];
    index.push({ _id: p._id, type: p.type, file, width: p.width, height: p.height, createdAt: p.createdAt });
  }
  counts.photos = photos.length;
  files['photos.json'] = strToU8(JSON.stringify(index, null, 2));

  const manifest: Manifest = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), counts };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

  return new Blob([zipSync(files)], { type: 'application/zip' });
}

export function backupFileName(date = new Date()) {
  return `proof-cookbook-${date.toISOString().slice(0, 10)}.zip`;
}

const readJson = <T>(files: Record<string, Uint8Array>, name: string): T | undefined => {
  const bytes = files[name];
  if (!bytes) return undefined;
  try {
    return JSON.parse(strFromU8(bytes)) as T;
  } catch {
    throw new BackupFormatError(`${name} in that archive is damaged.`);
  }
};

const isRecord = (value: unknown): value is RecordFields =>
  !!value && typeof value === 'object' &&
  typeof (value as RecordFields)._id === 'string' &&
  typeof (value as RecordFields).updatedAt === 'string';

/** Merges a list of records into a store: newer wins, ties keep what is here. */
export async function mergeRecords(store: RecordStore, incoming: unknown[], result: ImportResult): Promise<void> {
  const toWrite: RecordFields[] = [];
  for (const row of incoming) {
    if (!isRecord(row)) continue;
    const current = await getOne<RecordFields>(store, row._id);
    // A record written before tombstones existed has no deletedAt or createdAt.
    const record: RecordFields = {
      ...row,
      deletedAt: row.deletedAt ?? null,
      createdAt: row.createdAt ?? row.updatedAt,
    };
    if (!current) {
      toWrite.push(record);
      result.added++;
    } else if (current.updatedAt < record.updatedAt) {
      toWrite.push(record);
      result.updated++;
    } else {
      result.unchanged++;
    }
  }
  await putMany(store, toWrite);
}

export async function importCookbook(archive: Blob): Promise<ImportResult> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await archive.arrayBuffer()));
  } catch {
    throw new BackupFormatError('That file is not a Proof backup: it is not a .zip archive.');
  }

  const manifest = readJson<Manifest>(files, 'manifest.json');
  if (!manifest || manifest.format !== BACKUP_FORMAT) {
    throw new BackupFormatError('That archive is not a Proof backup: it has no Proof manifest.');
  }
  if (manifest.version > BACKUP_VERSION) {
    throw new BackupFormatError('That backup was made by a newer version of Proof. Update the app, then import it.');
  }

  const result: ImportResult = { added: 0, updated: 0, unchanged: 0, photos: 0 };

  // Photographs first, so no record ever points at a photo that isn't there yet.
  for (const entry of readJson<PhotoEntry[]>(files, 'photos.json') ?? []) {
    const bytes = files[entry.file];
    if (!bytes || (await getOne<PhotoRecord>('photos', entry._id))) continue;
    const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: entry.type });
    await putOne('photos', {
      _id: entry._id,
      blob,
      type: entry.type,
      bytes: blob.size,
      width: entry.width,
      height: entry.height,
      createdAt: entry.createdAt,
    } satisfies PhotoRecord);
    result.photos++;
  }

  for (const store of RECORD_STORES) {
    const rows = readJson<unknown[]>(files, `${store}.json`);
    if (Array.isArray(rows)) await mergeRecords(store, rows, result);
  }
  return result;
}
