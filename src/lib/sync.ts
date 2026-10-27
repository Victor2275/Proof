/*
 * Keeping a Pro account's devices in step (LAUNCH_PLAN.md, Phase 4).
 *
 * The device stays the source of truth: everything here runs after the fact,
 * and a cookbook with no network, no account or no Pro works exactly as
 * before. A sync goes:
 *
 *   1. photographs up — each one a record uses that the server lacks, so a
 *      device that pulls the record can fetch the picture;
 *   2. records up — what the outbox marks (repo/outbox.ts), 200 at a time;
 *   3. records down — everything changed since this device's cursor, a page
 *      at a time, and the photographs uploaded since;
 *   4. photographs down — fetched by address and stored under their own id,
 *      so no record is rewritten.
 *
 * Last write wins, on the record's own `updatedAt`. When a recipe edited here
 * loses to a newer one from another device, the edit is not thrown away: it
 * becomes the recipe's draft (lib/recipeDraft.ts), and the editor offers it.
 */
import { api, ApiError, type SyncChange } from './api';
import { currentAccount } from './session';
import { getOne, putMany, putOne, deleteMany, getAll, type RecordStore } from './repo/db';
import { clearDirty, dirtyRecords, isDirty, markEverythingDirty } from './repo/outbox';
import { isPhotoRef, photoIdOf, PHOTO_PREFIX, PHOTOS_ARRIVED, type PhotoRecord } from './repo/photos';
import { blobToDataUrl } from './image';
import { saveRecipeDraft } from './recipeDraft';
import type { Draft, Recipe, RecordFields } from './types';

const CURSOR = 'sync.cursor';
const PHOTO_UP = 'photo-up:';
const PHOTO_DOWN = 'photo-down:';
const BATCH = 200;
const LAST_KEY = 'proof.sync.last';

/** The cookbook changed under the app: screens should read it again. */
export const SYNCED_EVENT = 'cookbook-synced';

export interface SyncStatus {
  state: 'off' | 'idle' | 'syncing' | 'error';
  /** ISO time of the last sync that finished. */
  lastSyncedAt: string | null;
  error: string;
  /** Photographs the server could not take yet. */
  photosWaiting: number;
}

/* ── Status, for the account panel ─────────────────────────────────────── */

const readLast = () => {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
};

let status: SyncStatus = { state: 'off', lastSyncedAt: readLast(), error: '', photosWaiting: 0 };
const listeners = new Set<() => void>();

function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}

export const getSyncStatus = () => status;
export function subscribeSyncStatus(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Whether this device may sync now: a confirmed Pro account is signed in. */
export function canSync(): boolean {
  const account = currentAccount();
  return !!account?.emailVerified && account.plan === 'pro';
}

/* ── Applying what the server sent ─────────────────────────────────────── */

const strip = (r: Recipe): Draft<Recipe> => {
  const { _id, createdAt, updatedAt, deletedAt, ...draft } = r;
  void _id; void createdAt; void updatedAt; void deletedAt;
  return draft;
};

interface Outcome {
  changed: boolean;
  /** Titles of recipes whose edit here lost, and became a draft. */
  keptAsDrafts: string[];
}

async function apply(changes: SyncChange[], outcome: Outcome) {
  const byStore = new Map<RecordStore, RecordFields[]>();
  for (const { store, record } of changes) {
    const here = await getOne<RecordFields>(store, record._id);
    if (here && here.updatedAt >= record.updatedAt) continue;
    if (here && (await isDirty(store, record._id))) {
      // Edited here, and newer there: the edit here loses. A recipe's is kept as its draft.
      const mine = here as Recipe;
      if (store === 'recipes' && !mine.deletedAt && !record.deletedAt) {
        saveRecipeDraft(mine._id, strip(mine), record.updatedAt);
        outcome.keptAsDrafts.push(mine.title || 'A recipe');
      }
      await clearDirty(store, [record._id]);
    }
    byStore.set(store, [...(byStore.get(store) ?? []), record]);
  }
  for (const [store, records] of byStore) {
    await putMany(store, records);
    outcome.changed = true;
  }
}

/* ── Photographs ───────────────────────────────────────────────────────── */

/** Every photograph a live record on the device uses. */
async function usedPhotoIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const store of ['recipes', 'bakeLogs'] as const) {
    for (const r of await getAll<RecordFields & { imageUrls?: string[]; images?: { url: string }[] }>(store)) {
      if (r.deletedAt) continue;
      for (const ref of [...(r.imageUrls ?? []), ...(r.images ?? []).map((i) => i.url)]) {
        if (isPhotoRef(ref)) ids.add(photoIdOf(ref));
      }
    }
  }
  return ids;
}

/** Uploads what the server lacks. Returns how many could not go up. */
async function pushPhotos(): Promise<number> {
  const known = new Set((await getAll<{ key: string }>('meta')).map((m) => m.key));
  const pending = [...(await usedPhotoIds())].filter((id) => !known.has(PHOTO_UP + id));
  let waiting = 0;
  for (const [i, id] of pending.entries()) {
    const photo = await getOne<PhotoRecord>('photos', id);
    if (!photo) continue; // only on another device; it comes down, not up
    try {
      await api.syncPhoto(id, await blobToDataUrl(photo.blob));
      await putOne('meta', { key: PHOTO_UP + id });
    } catch (err) {
      // The server can't store photographs at all right now: the rest wait too.
      if (err instanceof ApiError && err.status === 503) return pending.length - i;
      waiting++;
    }
  }
  return waiting;
}

async function pullPhotos(): Promise<string[]> {
  const queued = (await getAll<{ key: string; url?: string }>('meta')).filter((m) => m.key.startsWith(PHOTO_DOWN));
  const arrived: string[] = [];
  for (const { key, url } of queued) {
    const id = key.slice(PHOTO_DOWN.length);
    if (await getOne('photos', id)) {
      await deleteMany('meta', [key]);
      continue;
    }
    try {
      const res = await fetch(url!);
      if (!res.ok) continue;
      const blob = await res.blob();
      await putOne('photos', { _id: id, blob, type: blob.type, bytes: blob.size, createdAt: new Date().toISOString() });
      await putMany('meta', [{ key: PHOTO_UP + id }]);
      await deleteMany('meta', [key]);
      arrived.push(PHOTO_PREFIX + id);
    } catch {
      // Offline, or the address is gone for now: tried again next sync.
    }
  }
  return arrived;
}

/* ── The sync ──────────────────────────────────────────────────────────── */

let running: Promise<void> | null = null;
let again = false;

/** Syncs now, or as soon as the sync already running finishes. Never throws. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce() {
  const account = currentAccount();
  if (!account || !canSync()) {
    setStatus({ state: 'off', error: '' });
    return;
  }
  setStatus({ state: 'syncing', error: '' });
  const outcome: Outcome = { changed: false, keptAsDrafts: [] };
  try {
    let saved = await getOne<{ key: string; userId: string; cursor: string | null }>('meta', CURSOR);
    if (saved?.userId !== account.id) {
      // This account's first sync from this device: everything here goes up.
      await markEverythingDirty();
      await deleteMany('meta', (await getAll<{ key: string }>('meta')).filter((m) => m.key.startsWith(PHOTO_UP)).map((m) => m.key));
      saved = { key: CURSOR, userId: account.id, cursor: null };
    }

    const photosWaiting = await pushPhotos();

    const dirty = await dirtyRecords();
    for (let i = 0; i < dirty.length; i += BATCH) {
      const changes: SyncChange[] = [];
      for (const { store, id } of dirty.slice(i, i + BATCH)) {
        const record = await getOne<SyncChange['record']>(store, id);
        if (record) changes.push({ store, record });
      }
      const { newer } = await api.sync({ changes });
      // Pushed: unmark each one that has not changed again since it was read.
      // One the server had newer stays marked, so `apply` sees it lost.
      const lost = new Set(newer.map((n) => `${n.store}:${n.record._id}`));
      for (const { store, record } of changes) {
        if (lost.has(`${store}:${record._id}`)) continue;
        const now = await getOne<RecordFields>(store, record._id);
        if (now?.updatedAt === record.updatedAt) await clearDirty(store, [record._id]);
      }
      await apply(newer, outcome);
    }

    let cursor = saved.cursor;
    for (;;) {
      const page = await api.sync({ since: cursor });
      await apply(page.changes ?? [], outcome);
      const queued = Object.entries(page.photos ?? {});
      if (queued.length) await putMany('meta', queued.map(([id, url]) => ({ key: PHOTO_DOWN + id, url })));
      cursor = page.cursor ?? cursor;
      await putOne('meta', { key: CURSOR, userId: account.id, cursor });
      if (!page.more) break;
    }

    const arrived = await pullPhotos();
    if (arrived.length) window.dispatchEvent(new CustomEvent(PHOTOS_ARRIVED, { detail: arrived }));

    const at = new Date().toISOString();
    try {
      localStorage.setItem(LAST_KEY, at);
    } catch {
      // Storage blocked: the time shows for this session only.
    }
    setStatus({ state: 'idle', lastSyncedAt: at, photosWaiting });
  } catch (err) {
    setStatus({
      state: 'error',
      error: err instanceof ApiError && err.status === 0
        ? "Couldn't reach the server. It syncs when you're back online."
        : `${err instanceof Error ? err.message : 'Sync stopped.'} It tries again shortly.`,
    });
  } finally {
    if (outcome.changed || outcome.keptAsDrafts.length) {
      window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: { keptAsDrafts: outcome.keptAsDrafts } }));
    }
  }
}
