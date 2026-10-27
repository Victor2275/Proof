import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError, type SyncResponse } from './api';
import { repo } from './repo';
import { getOne } from './repo/db';
import { dirtyRecords } from './repo/outbox';
import { savePhoto, getPhotoBlob, PHOTOS_ARRIVED } from './repo/photos';
import { readRecipeDraft } from './recipeDraft';
import { setAccount } from './session';
import { getSyncStatus, syncNow, SYNCED_EVENT } from './sync';
import { signInAs } from '../test/utils';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  api: { sync: vi.fn(), syncPhoto: vi.fn() },
}));

const sync = vi.mocked(api.sync);
const syncPhoto = vi.mocked(api.syncPhoto);

/** A server with nothing new: accepts every push, and every pull is one empty page. */
const quietServer = () =>
  sync.mockImplementation(async (body) =>
    ('since' in body ? { accepted: 0, newer: [], changes: [], cursor: 'c1', more: false, photos: {} } : { accepted: body.changes!.length, newer: [] }) as SyncResponse,
  );

const pushed = () => sync.mock.calls.flatMap(([body]) => body.changes ?? []);
const pulls = () => sync.mock.calls.filter(([body]) => 'since' in body).map(([body]) => body.since);

beforeEach(() => {
  signInAs({ plan: 'pro', pro: true });
  quietServer();
});

afterEach(() => setAccount(null));

describe('sync', () => {
  it('does nothing for an account that is not Pro, or for nobody', async () => {
    setAccount(null);
    await syncNow();
    signInAs();
    await syncNow();
    expect(sync).not.toHaveBeenCalled();
    expect(getSyncStatus().state).toBe('off');
  });

  it("sends the whole cookbook on an account's first sync, then only what changed", async () => {
    const rye = await repo.createRecipe({ title: 'Rye', description: '', imageUrls: [], servings: 1, prepTime: '', cookTime: '', tags: [], ingredients: [], instructions: [] });
    await repo.createNote({ title: 'Oven', content: 'Runs cold' });
    await syncNow();
    expect(pushed().map((c) => c.record._id)).toHaveLength(2);
    expect(pulls()).toEqual([null]);
    expect(await dirtyRecords()).toEqual([]);
    expect(getSyncStatus()).toMatchObject({ state: 'idle', error: '' });

    sync.mockClear();
    await repo.updateRecipe(rye._id, { title: 'Dark rye' });
    await syncNow();
    expect(pushed().map((c) => c.record)).toEqual([expect.objectContaining({ _id: rye._id, title: 'Dark rye' })]);
    expect(pulls()).toEqual(['c1']);
  });

  it('takes what changed on another device, and tells the screens', async () => {
    const synced = vi.fn();
    window.addEventListener(SYNCED_EVENT, synced);
    sync.mockImplementation(async (body) =>
      ('since' in body
        ? {
            accepted: 0, newer: [], cursor: 'c2', more: false, photos: {},
            changes: [{ store: 'recipes', record: { _id: 'r9', title: 'Babka', createdAt: '2026-10-01', updatedAt: '2026-10-02', deletedAt: null } }],
          }
        : { accepted: 0, newer: [] }) as SyncResponse,
    );
    await syncNow();
    expect((await repo.getRecipe('r9'))?.title).toBe('Babka');
    expect(synced).toHaveBeenCalled();
    // Taken from the server, so not sent back to it.
    expect(await dirtyRecords()).toEqual([]);
    window.removeEventListener(SYNCED_EVENT, synced);
  });

  it('keeps an edit that lost to a newer one as the recipe’s draft', async () => {
    const rye = await repo.createRecipe({ title: 'Rye', description: '', imageUrls: [], servings: 1, prepTime: '', cookTime: '', tags: [], ingredients: [], instructions: [] });
    const synced = vi.fn();
    window.addEventListener(SYNCED_EVENT, synced);
    sync.mockImplementation(async (body) =>
      ('since' in body
        ? { accepted: 0, newer: [], changes: [], cursor: 'c1', more: false, photos: {} }
        : { accepted: 0, newer: [{ store: 'recipes', record: { ...rye, title: 'Rye from the laptop', updatedAt: '2999-01-01T00:00:00.000Z' } }] }) as SyncResponse,
    );
    await syncNow();
    expect((await repo.getRecipe(rye._id))?.title).toBe('Rye from the laptop');
    expect(readRecipeDraft(rye._id)?.recipe.title).toBe('Rye');
    expect(synced.mock.calls[0][0].detail.keptAsDrafts).toEqual(['Rye']);
    window.removeEventListener(SYNCED_EVENT, synced);
  });

  it('pages through a long pull, keeping the cursor as it goes', async () => {
    const pages: SyncResponse[] = [
      { accepted: 0, newer: [], changes: [{ store: 'notes', record: { _id: 'n1', createdAt: 'a', updatedAt: 'a', deletedAt: null } }], cursor: 'p1', more: true },
      { accepted: 0, newer: [], changes: [{ store: 'notes', record: { _id: 'n2', createdAt: 'a', updatedAt: 'a', deletedAt: null } }], cursor: 'p2', more: false },
    ];
    sync.mockImplementation(async (body) => ('since' in body ? pages.shift()! : { accepted: 0, newer: [] }) as SyncResponse);
    await syncNow();
    expect(pulls()).toEqual([null, 'p1']);
    expect((await repo.getNotes()).map((n) => n._id).sort()).toEqual(['n1', 'n2']);
    expect(await getOne('meta', 'sync.cursor')).toMatchObject({ cursor: 'p2' });
  });

  it('uploads the photographs records use, and says how many wait when the server cannot take them', async () => {
    const ref = await savePhoto(new Blob(['x'], { type: 'image/webp' }));
    await repo.createRecipe({ title: 'Rye', description: '', imageUrls: [ref], servings: 1, prepTime: '', cookTime: '', tags: [], ingredients: [], instructions: [] });
    syncPhoto.mockRejectedValueOnce(new ApiError("The server can't store photographs yet.", 503, true));
    await syncNow();
    expect(getSyncStatus().photosWaiting).toBe(1);

    syncPhoto.mockResolvedValue({ url: 'https://res.cloudinary.com/x.webp' });
    await syncNow();
    expect(getSyncStatus().photosWaiting).toBe(0);
    syncPhoto.mockClear();
    await syncNow();
    expect(syncPhoto).not.toHaveBeenCalled();
  });

  it('fetches photographs another device uploaded, under their own id', async () => {
    const arrived = vi.fn();
    window.addEventListener(PHOTOS_ARRIVED, arrived);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['img'], { type: 'image/webp' })));
    sync.mockImplementation(async (body) =>
      ('since' in body
        ? { accepted: 0, newer: [], changes: [], cursor: 'c1', more: false, photos: { p7: 'https://res.cloudinary.com/p7.webp' } }
        : { accepted: 0, newer: [] }) as SyncResponse,
    );
    await syncNow();
    expect(await getPhotoBlob('photo:p7')).toBeDefined();
    expect(arrived.mock.calls[0][0].detail).toEqual(['photo:p7']);
    window.removeEventListener(PHOTOS_ARRIVED, arrived);
    vi.restoreAllMocks();
  });

  it('says what went wrong, and keeps what was not sent for next time', async () => {
    await repo.createNote({ title: 'Oven', content: 'Runs cold' });
    sync.mockRejectedValue(new ApiError("Can't reach the server.", 0));
    await syncNow();
    expect(getSyncStatus()).toMatchObject({ state: 'error', error: "Couldn't reach the server. It syncs when you're back online." });
    expect(await dirtyRecords()).toHaveLength(1);
  });
});
