/*
 * Sync (LAUNCH_PLAN.md, Phase 4): deliberately boring.
 *
 * A device pushes the records it changed; each is kept if it is newer, by its
 * own `updatedAt`, than the copy already here — last write wins, tombstones
 * included. A device pulls everything that changed here since its cursor.
 *
 * The cursor is the server's clock and a record id (`<iso>|<id>`), because a
 * push of many records lands in the same millisecond and a page must not end
 * halfway through one. A pull that reaches the end hands back a cursor a few
 * seconds in the past, so a write still landing while the pull was read is
 * read again next time rather than missed; reading a record twice is harmless.
 */
import { SyncRecord } from '../models/SyncRecord.js';
import { SyncPhoto } from '../models/SyncPhoto.js';

export const SYNC_STORES = ['recipes', 'bakeLogs', 'pantry', 'notes', 'folders', 'shopping'] as const;
export type SyncStore = (typeof SYNC_STORES)[number];

export const PAGE = 500;
export const OVERLAP_MS = 10_000;
const MAX_RECORD_BYTES = 256 * 1024;
const ID = /^[\w:-]{1,64}$/;

export interface SyncedRecord {
  _id: string;
  updatedAt: string;
  deletedAt: string | null;
  [field: string]: unknown;
}

export interface Change {
  store: SyncStore;
  record: SyncedRecord;
}

const keyOf = (userId: string, store: string, recordId: string) => `${userId}:${store}:${recordId}`;

/** A change as a device sent it, or null if it is not one. */
export function validChange(raw: unknown): Change | null {
  if (!raw || typeof raw !== 'object') return null;
  const { store, record } = raw as { store?: unknown; record?: unknown };
  if (typeof store !== 'string' || !(SYNC_STORES as readonly string[]).includes(store)) return null;
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const r = record as Record<string, unknown>;
  if (typeof r._id !== 'string' || !ID.test(r._id)) return null;
  if (typeof r.updatedAt !== 'string' || Number.isNaN(Date.parse(r.updatedAt))) return null;
  if (r.deletedAt !== null && r.deletedAt !== undefined && typeof r.deletedAt !== 'string') return null;
  if (JSON.stringify(r).length > MAX_RECORD_BYTES) return null;
  return { store: store as SyncStore, record: { ...r, deletedAt: (r.deletedAt as string | null | undefined) ?? null } as SyncedRecord };
}

export function parseCursor(raw: unknown): { at: Date; id: string } | null {
  if (typeof raw !== 'string') return null;
  const [iso, id = ''] = raw.split('|');
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : { at, id };
}

const formatCursor = (at: Date, id: string) => `${at.toISOString()}|${id}`;

type Row = { _id: string; store: string; updatedAt: string; data: SyncedRecord };
const asChange = (row: Row): Change => ({ store: row.store as SyncStore, record: row.data });

/**
 * Keeps each change that is newer than the copy here. Returns the copies that
 * were newer than what the device sent, so the device can take them instead.
 */
export async function applyChanges(userId: string, changes: Change[], now = new Date()) {
  // The same record twice in one push: the newer stands for both.
  const byKey = new Map<string, Change>();
  for (const c of changes) {
    const key = keyOf(userId, c.store, c.record._id);
    const seen = byKey.get(key);
    if (!seen || seen.record.updatedAt < c.record.updatedAt) byKey.set(key, c);
  }
  const existing = new Map(
    (await SyncRecord.find({ _id: { $in: [...byKey.keys()] } }).lean<Row[]>()).map((row) => [row._id, row]),
  );

  const writes = [];
  const newer: Change[] = [];
  for (const [key, change] of byKey) {
    const here = existing.get(key);
    if (here && here.updatedAt > change.record.updatedAt) {
      newer.push(asChange(here));
      continue;
    }
    if (here && here.updatedAt === change.record.updatedAt) continue;
    writes.push({
      replaceOne: {
        filter: { _id: key },
        replacement: {
          _id: key, userId, store: change.store, recordId: change.record._id,
          updatedAt: change.record.updatedAt, data: change.record, syncedAt: now,
        },
        upsert: true,
      },
    });
  }
  if (writes.length) await SyncRecord.bulkWrite(writes, { ordered: false });
  return { accepted: writes.length, newer };
}

/** One page of what changed since the cursor, the next cursor, and the photographs uploaded since. */
export async function changesSince(userId: string, rawCursor: unknown, now = new Date(), limit = PAGE) {
  const cursor = parseCursor(rawCursor);
  const filter = cursor
    ? { userId, $or: [{ syncedAt: { $gt: cursor.at } }, { syncedAt: cursor.at, _id: { $gt: cursor.id } }] }
    : { userId };
  const rows = await SyncRecord.find(filter).sort({ syncedAt: 1, _id: 1 }).limit(limit + 1).lean<(Row & { syncedAt: Date })[]>();
  const more = rows.length > limit;
  const page = more ? rows.slice(0, limit) : rows;

  let next: string;
  if (more) {
    const last = page[page.length - 1];
    next = formatCursor(last.syncedAt, last._id);
  } else {
    const settled = new Date(now.getTime() - OVERLAP_MS);
    next = cursor && cursor.at > settled ? formatCursor(cursor.at, '') : formatCursor(settled, '');
  }

  const photoFilter = cursor ? { userId, createdAt: { $gt: new Date(cursor.at.getTime() - OVERLAP_MS) } } : { userId };
  const photos = await SyncPhoto.find(photoFilter).lean<{ photoId: string; url: string }[]>();

  return {
    changes: page.map(asChange),
    cursor: next,
    more,
    photos: Object.fromEntries(photos.map((p) => [p.photoId, p.url])),
  };
}

/** Everything synced for an account, by store (the account export). */
export async function syncedCookbook(userId: string) {
  const rows = await SyncRecord.find({ userId }).lean<Row[]>();
  const byStore: Record<string, SyncedRecord[]> = {};
  for (const row of rows) (byStore[row.store] ??= []).push(row.data);
  return byStore;
}
