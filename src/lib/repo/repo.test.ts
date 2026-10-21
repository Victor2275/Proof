import { describe, it, expect, vi } from 'vitest';
import { repo, MissingRecordError } from './index';
import { DB_NAME, getAll, getOne, openDB, closeDB } from './db';
import { collectPhotoGarbage, PHOTO_GRACE_MS, savePhoto, getPhotoBlob, isPhotoRef } from './photos';
import { isUlid } from '../ulid';
import type { PublishedRecipe, Recipe } from '../types';
import { makeRecipe, seed } from '../../test/utils';

const draft = (title: string) => {
  const { _id, createdAt, updatedAt, deletedAt, ...rest } = makeRecipe({ title });
  void _id; void createdAt; void updatedAt; void deletedAt;
  return rest;
};

describe('the repository', () => {
  it('mints a ULID and the sync fields for every record it creates', async () => {
    const recipe = await repo.createRecipe(draft('Rye'));
    expect(isUlid(recipe._id)).toBe(true);
    expect(recipe.createdAt).toBe(recipe.updatedAt);
    expect(recipe.deletedAt).toBeNull();
    expect(await repo.getRecipe(recipe._id)).toEqual(recipe);
  });

  it('moves updatedAt on a write, and never lets a patch move the record fields', async () => {
    const recipe = await repo.createRecipe(draft('Rye'));
    await new Promise((r) => setTimeout(r, 5));
    const patch = { title: 'Dark rye', _id: 'hijack', createdAt: '1999-01-01' } as unknown as Partial<Recipe>;
    const updated = await repo.updateRecipe(recipe._id, patch);

    expect(updated.title).toBe('Dark rye');
    expect(updated._id).toBe(recipe._id);
    expect(updated.createdAt).toBe(recipe.createdAt);
    expect(updated.updatedAt > recipe.updatedAt).toBe(true);
  });

  it('deletes as a tombstone: gone from every read, still in the store for sync', async () => {
    const recipe = await repo.createRecipe(draft('Rye'));
    await repo.deleteRecipe(recipe._id);

    expect(await repo.getRecipe(recipe._id)).toBeNull();
    expect(await repo.getRecipes()).toEqual([]);
    const stored = await getOne<Recipe>('recipes', recipe._id);
    expect(stored?.deletedAt).toEqual(expect.any(String));
    expect(stored?.updatedAt).toBe(stored?.deletedAt);
  });

  it('refuses to update a record the device does not have, by name', async () => {
    await expect(repo.updateRecipe('nope', { title: 'x' })).rejects.toBeInstanceOf(MissingRecordError);
    const recipe = await repo.createRecipe(draft('Rye'));
    await repo.deleteRecipe(recipe._id);
    await expect(repo.updateRecipe(recipe._id, { title: 'x' })).rejects.toThrow(/not on this device/);
  });

  it('lists newest first', async () => {
    await seed('recipes', [
      makeRecipe({ _id: 'a', title: 'Old', updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeRecipe({ _id: 'b', title: 'New', updatedAt: '2026-06-01T00:00:00.000Z' }),
    ]);
    expect((await repo.getRecipes()).map((r) => r.title)).toEqual(['New', 'Old']);
  });

  it('keeps a folder record for each folder a recipe is filed in, once', async () => {
    await repo.createRecipe({ ...draft('A'), folder: 'Breads' });
    await repo.createRecipe({ ...draft('B'), folder: 'breads' });
    await repo.createRecipe({ ...draft('C'), folder: 'Uncategorized' });
    expect((await repo.getFolders()).map((f) => f.name)).toEqual(['Breads']);
  });

  it("reads a recipe's bakes by index, newest first, and skips deleted ones", async () => {
    const first = await repo.createBakeLog({ recipeId: 'r1', notes: 'one', date: '2026-08-01T00:00:00.000Z' });
    await repo.createBakeLog({ recipeId: 'r1', notes: 'two', date: '2026-08-02T00:00:00.000Z' });
    await repo.createBakeLog({ recipeId: 'r2', notes: 'other', date: '2026-08-03T00:00:00.000Z' });
    await repo.deleteBakeLog(first._id);

    expect((await repo.getRecipeBakeLogs('r1')).map((l) => l.notes)).toEqual(['two']);
    expect((await repo.getBakeLogs()).map((l) => l.notes)).toEqual(['other', 'two']);
  });

  it('stores bake photographs as blobs and keeps the two image lists in step', async () => {
    const log = await repo.createBakeLog({ recipeId: 'r1', notes: '' }, [
      { file: new Blob(['crumb'], { type: 'image/jpeg' }), label: 'Crumb' },
    ]);
    expect(log.images).toHaveLength(1);
    expect(isPhotoRef(log.images![0].url)).toBe(true);
    expect(log.imageUrls).toEqual([log.images![0].url]);
    expect(await getPhotoBlob(log.images![0].url)).toBeDefined();

    const updated = await repo.updateBakeLog(log._id, { images: [] });
    expect(updated.imageUrls).toEqual([]);
  });

  it('forks a shared recipe into an editable local copy that remembers its source', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const published: PublishedRecipe = {
      _id: 'p1', slug: 'focaccia', title: 'Focaccia', description: 'Oily.', imageUrls: ['https://cdn.example/f.jpg'],
      servings: null, difficulty: '', prepTime: '20', cookTime: '25', tags: ['bread'], folder: 'Breads',
      ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }], instructions: ['Mix.'],
      authorHandle: 'proof', sourceAttribution: '', publishedAt: '2026-08-01T00:00:00.000Z',
    };
    const copy = await repo.forkPublished(published);

    expect(copy._id).not.toBe('p1');
    expect(copy.forkedFrom).toEqual({ publishedId: 'p1', slug: 'focaccia', authorHandle: 'proof', title: 'Focaccia' });
    expect(copy.servings).toBe(4);
    expect(copy.difficulty).toBeUndefined();
    // The host refused, so the web address is kept and loads when it can.
    expect(copy.imageUrls).toEqual(['https://cdn.example/f.jpg']);
  });

  it('adds and removes pantry items, oldest first', async () => {
    const flour = await repo.addPantryItem({ name: '  Flour ' });
    await new Promise((r) => setTimeout(r, 2));
    await repo.addPantryItem({ name: 'Salt' });
    expect((await repo.getPantry()).map((p) => p.name)).toEqual(['Flour', 'Salt']);
    await repo.deletePantryItem(flour._id);
    expect((await repo.getPantry()).map((p) => p.name)).toEqual(['Salt']);
  });
});

describe('photo garbage collection', () => {
  it('removes photographs no live record uses, after the grace period', async () => {
    const kept = await savePhoto(new Blob(['a'], { type: 'image/webp' }));
    const orphan = await savePhoto(new Blob(['b'], { type: 'image/webp' }));
    const deletedOnly = await savePhoto(new Blob(['c'], { type: 'image/webp' }));
    await seed('recipes', [
      makeRecipe({ _id: 'live', imageUrls: [kept] }),
      makeRecipe({ _id: 'dead', imageUrls: [deletedOnly], deletedAt: '2026-08-01T00:00:00.000Z' }),
    ]);

    // Inside the grace period nothing goes: an unsaved editor may own it.
    expect(await collectPhotoGarbage()).toBe(0);

    const removed = await collectPhotoGarbage(Date.now() + PHOTO_GRACE_MS + 1000);
    expect(removed).toBe(2);
    expect(await getPhotoBlob(kept)).toBeDefined();
    expect(await getPhotoBlob(orphan)).toBeUndefined();
    expect(await getPhotoBlob(deletedOnly)).toBeUndefined();
  });
});

describe('upgrading from version 1', () => {
  /** The pre-Phase-1 database: one store of offline bake logs, photos as data URLs. */
  async function createVersionOne(logs: unknown[]) {
    await closeDB();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('localBakeLogs', { keyPath: '_id' });
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('localBakeLogs', 'readwrite');
        for (const log of logs) tx.objectStore('localBakeLogs').put(log);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  it('carries offline bake logs across, turning their data URLs into one stored blob each', async () => {
    const dataUrl = `data:image/jpeg;base64,${btoa('crumb')}`;
    await createVersionOne([
      {
        _id: 'local-1',
        recipeId: { _id: 'r1', title: 'Rye' },
        notes: 'Logged offline',
        date: '2026-07-01T10:00:00.000Z',
        imageUrls: [dataUrl],
        images: [{ url: dataUrl, label: 'Crumb' }],
      },
    ]);

    const db = await openDB();
    expect(Array.from(db.objectStoreNames)).not.toContain('localBakeLogs');

    const [log] = await repo.getRecipeBakeLogs('r1');
    expect(log.notes).toBe('Logged offline');
    expect(log.recipeId).toBe('r1');
    expect(log.createdAt).toBe('2026-07-01T10:00:00.000Z');
    expect(log.deletedAt).toBeNull();
    // imageUrls and images named the same photograph: it is stored once.
    expect(log.imageUrls[0]).toBe(log.images![0].url);
    expect(isPhotoRef(log.imageUrls[0])).toBe(true);
    expect(await getAll('photos')).toHaveLength(1);
  });
});
