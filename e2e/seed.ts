import type { Page } from '@playwright/test';

/*
 * Puts a cookbook on the device before the app starts.
 *
 * The cookbook lives in IndexedDB (src/lib/repo), not behind the API, so a
 * fixture library has to be written there. The records are written inside the
 * database's upgrade transaction, which no other connection can open until it
 * has finished: the app's first read waits for the seed rather than racing it.
 * On later navigations the database already exists, nothing upgrades, and
 * nothing is written over what the page has since changed.
 *
 * Keep the store layout in step with src/lib/repo/db.ts.
 */

export interface DeviceCookbook {
  recipes?: unknown[];
  bakeLogs?: unknown[];
  notes?: unknown[];
  pantry?: unknown[];
}

export async function seedDevice(page: Page, cookbook: DeviceCookbook) {
  await page.addInitScript((data: DeviceCookbook) => {
    const STAMP = '2026-08-01T12:00:00.000Z';
    const idOf = (v: unknown) =>
      typeof v === 'object' && v !== null && '_id' in v ? String((v as { _id: unknown })._id) : String(v);
    const asRecord = (row: Record<string, unknown>) => ({
      ...row,
      _id: idOf(row._id),
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : STAMP,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : STAMP,
      deletedAt: null,
    });

    const request = indexedDB.open('CulinaryLabDB', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      const stores = ['recipes', 'bakeLogs', 'pantry', 'notes', 'folders'] as const;
      for (const name of stores) {
        const store = db.createObjectStore(name, { keyPath: '_id' });
        if (name === 'bakeLogs') store.createIndex('recipeId', 'recipeId');
      }
      db.createObjectStore('photos', { keyPath: '_id' });
      db.createObjectStore('meta', { keyPath: 'key' });

      const tx = request.transaction!;
      for (const r of (data.recipes ?? []) as Record<string, unknown>[]) tx.objectStore('recipes').put(asRecord(r));
      for (const b of (data.bakeLogs ?? []) as Record<string, unknown>[]) {
        tx.objectStore('bakeLogs').put({ ...asRecord(b), recipeId: idOf(b.recipeId) });
      }
      for (const n of (data.notes ?? []) as Record<string, unknown>[]) tx.objectStore('notes').put(asRecord(n));
      for (const p of (data.pantry ?? []) as Record<string, unknown>[]) tx.objectStore('pantry').put(asRecord(p));
      const folders = new Set(
        ((data.recipes ?? []) as { folder?: string }[]).map((r) => r.folder).filter((f) => f && f !== 'Uncategorized'),
      );
      for (const name of folders) tx.objectStore('folders').put({ _id: `folder-${name}`, name, createdAt: STAMP, updatedAt: STAMP, deletedAt: null });
    };
    request.onsuccess = () => request.result.close();
  }, cookbook);
}
