/*
 * What this device has changed and not yet synced (lib/sync.ts).
 *
 * Every write the repository makes marks its record here, in the `meta`
 * store, one row per record however often it changes. A sync pushes what is
 * marked and clears a mark once the server has that version. Records written
 * by a sync itself are never marked, so nothing echoes back.
 *
 * Marking is cheap and happens for everyone: without Pro nothing is ever
 * pushed, and the first sync of an account marks the whole cookbook anyway.
 */
import { getAll, getOne, putMany, deleteMany, RECORD_STORES, type RecordStore } from './db';

const DIRTY = 'dirty:';
export const OUTBOX_EVENT = 'outbox-changed';

const keyOf = (store: RecordStore, id: string) => `${DIRTY}${store}:${id}`;

export async function markDirty(store: RecordStore, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await putMany('meta', ids.map((id) => ({ key: keyOf(store, id), store, id })));
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export async function isDirty(store: RecordStore, id: string): Promise<boolean> {
  return !!(await getOne('meta', keyOf(store, id)));
}

export async function clearDirty(store: RecordStore, ids: string[]): Promise<void> {
  await deleteMany('meta', ids.map((id) => keyOf(store, id)));
}

/** Every marked record, as store and id. */
export async function dirtyRecords(): Promise<{ store: RecordStore; id: string }[]> {
  const rows = await getAll<{ key: string; store?: RecordStore; id?: string }>('meta');
  return rows
    .filter((r) => r.key.startsWith(DIRTY) && r.store && r.id)
    .map((r) => ({ store: r.store!, id: r.id! }));
}

/** Marks every record on the device, tombstones too: an account's first sync sends the lot. */
export async function markEverythingDirty(): Promise<void> {
  for (const store of RECORD_STORES) {
    const rows = await getAll<{ _id: string }>(store);
    await markDirty(store, rows.map((r) => r._id));
  }
}
