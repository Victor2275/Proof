import { describe, it, expect, vi } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { IDBFactory } from 'fake-indexeddb';
import { exportCookbook, importCookbook, backupFileName, BackupFormatError, BACKUP_FORMAT } from './backup';
import { closeDB, getAll, getOne } from './db';
import { savePhoto, getPhotoBlob } from './photos';
import { repo } from './index';
import { toLocalRecords, importServerLibrary } from './legacy';
import { api } from '../api';
import type { Recipe } from '../types';
import { makeBakeLog, makeRecipe, seed } from '../../test/utils';

/** A new, empty device. */
async function freshDevice() {
  await closeDB();
  globalThis.indexedDB = new IDBFactory();
}

describe('export and import', () => {
  it('round-trips the whole cookbook, photographs included, onto another device', async () => {
    const photo = await savePhoto(new Blob(['crumb'], { type: 'image/webp' }));
    await seed('recipes', [makeRecipe({ _id: 'r1', title: 'Rye', imageUrls: [photo] })]);
    await seed('bakeLogs', [makeBakeLog({ _id: 'b1', recipeId: 'r1', imageUrls: [photo] })]);
    const archive = await exportCookbook();

    await freshDevice();
    const result = await importCookbook(archive);

    expect(result).toMatchObject({ added: 2, updated: 0, unchanged: 0, photos: 1 });
    expect((await repo.getRecipe('r1'))?.title).toBe('Rye');
    const blob = await getPhotoBlob(photo);
    expect(blob?.type).toBe('image/webp');
    expect(await blob?.text()).toBe('crumb');
  });

  it('changes nothing when the same archive is imported twice', async () => {
    await seed('recipes', [makeRecipe({ _id: 'r1' })]);
    const archive = await exportCookbook();
    expect(await importCookbook(archive)).toMatchObject({ added: 0, updated: 0, unchanged: 1 });
  });

  it('never lets an old backup overwrite a recipe edited since', async () => {
    await seed('recipes', [makeRecipe({ _id: 'r1', title: 'Old title', updatedAt: '2026-01-01T00:00:00.000Z' })]);
    const archive = await exportCookbook();
    await seed('recipes', [makeRecipe({ _id: 'r1', title: 'Edited since', updatedAt: '2026-02-01T00:00:00.000Z' })]);

    await importCookbook(archive);
    expect((await repo.getRecipe('r1'))?.title).toBe('Edited since');
  });

  it('carries a deletion across, so a deleted recipe stays deleted', async () => {
    await seed('recipes', [makeRecipe({ _id: 'r1', updatedAt: '2026-01-01T00:00:00.000Z' })]);
    await freshDevice();
    await seed('recipes', [makeRecipe({ _id: 'r1', updatedAt: '2026-01-01T00:00:00.000Z' })]);
    await repo.deleteRecipe('r1');
    const archive = await exportCookbook();

    await freshDevice();
    await seed('recipes', [makeRecipe({ _id: 'r1', updatedAt: '2026-01-01T00:00:00.000Z' })]);
    await importCookbook(archive);
    expect(await repo.getRecipe('r1')).toBeNull();
  });

  it('names what is wrong with a file that is not a backup', async () => {
    await expect(importCookbook(new Blob(['hello']))).rejects.toThrow(/not a \.zip archive/);

    const otherZip = new Blob([zipSync({ 'readme.txt': strToU8('hi') })]);
    await expect(importCookbook(otherZip)).rejects.toBeInstanceOf(BackupFormatError);

    const future = new Blob([
      zipSync({ 'manifest.json': strToU8(JSON.stringify({ format: BACKUP_FORMAT, version: 99, exportedAt: '', counts: {} })) }),
    ]);
    await expect(importCookbook(future)).rejects.toThrow(/newer version of Proof/);
  });

  it('skips rows that are not records rather than writing junk', async () => {
    const archive = new Blob([
      zipSync({
        'manifest.json': strToU8(JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: '', counts: {} })),
        'recipes.json': strToU8(JSON.stringify([{ title: 'no id' }, makeRecipe({ _id: 'ok' })])),
      }),
    ]);
    expect(await importCookbook(archive)).toMatchObject({ added: 1 });
    expect(await getAll<Recipe>('recipes')).toHaveLength(1);
  });

  it('names the file by its date', () => {
    expect(backupFileName(new Date('2026-10-20T12:00:00Z'))).toBe('proof-cookbook-2026-10-20.zip');
  });
});

describe('copying the server library onto the device', () => {
  const SERVER = {
    recipes: [
      {
        _id: '64f000000000000000000001',
        title: 'Seeded',
        folder: 'Breads',
        __v: 0,
        versionNumber: 3,
        isLatestVersion: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-02-01T00:00:00.000Z',
        instructionLinks: [{ stepIndex: 0, recipeId: { _id: '64f000000000000000000002' }, recipeTitle: 'Frosting' }],
      },
    ],
    bakeLogs: [{ _id: 'b1', recipeId: { _id: '64f000000000000000000001', title: 'Seeded' }, date: '2025-03-01', notes: '' }],
    notes: [{ _id: 'n1', title: 'Hi', content: '' }],
    pantry: [{ _id: 'p1', name: 'Flour', createdAt: '2025-01-01T00:00:00.000Z' }],
  };

  it("keeps every record's id, strips server-only fields, and flattens references", () => {
    const local = toLocalRecords(SERVER);
    const recipe = local.recipes[0] as Record<string, unknown>;
    expect(recipe._id).toBe('64f000000000000000000001');
    expect(recipe).not.toHaveProperty('__v');
    expect(recipe).not.toHaveProperty('versionNumber');
    expect(recipe.deletedAt).toBeNull();
    expect((recipe.instructionLinks as { recipeId: string }[])[0].recipeId).toBe('64f000000000000000000002');
    expect(local.bakeLogs[0].recipeId).toBe('64f000000000000000000001');
    // A record from before timestamps existed still gets them, so it can merge.
    expect(local.notes[0].updatedAt).toEqual(expect.any(String));
  });

  it('merges like an import: running it twice adds nothing', async () => {
    vi.spyOn(api, 'getServerLibrary').mockResolvedValue(SERVER);
    expect((await importServerLibrary()).added).toBe(4);
    expect((await importServerLibrary()).added).toBe(0);
    expect((await repo.getFolders()).map((f) => f.name)).toEqual(['Breads']);
    expect(await getOne('bakeLogs', 'b1')).toBeDefined();
  });
});
