/*
 * The repository: where the app's own data lives.
 *
 * Every hook and screen asks the repository for the cookbook, never the
 * server. The repository reads and writes the device database, so the
 * cookbook works with no network and no account (LAUNCH_PLAN.md, Phase 1).
 * The server is asked only for what is genuinely remote — the shared
 * cookbook, and the AI — and that goes through src/lib/api.ts.
 *
 * Deletes are tombstones: the record stays with `deletedAt` set, so a future
 * sync can tell "deleted here" from "never existed here". Reads skip them.
 */
import { ulid } from '../ulid';
import { ensurePersistentStorage } from '../storage';
import type { BakeLog, Draft, Folder, Note, PantryItem, PublishedRecipe, Recipe, RecordFields } from '../types';
import { getAll, getByIndex, getOne, putOne, type RecordStore } from './db';
import { adoptRemotePhoto, collectPhotoGarbage, savePhoto } from './photos';

const nowIso = () => new Date().toISOString();

const live = <T extends RecordFields>(rows: T[]) => rows.filter((r) => !r.deletedAt);

const newest = (a: RecordFields, b: RecordFields) => b.updatedAt.localeCompare(a.updatedAt);

/** A write that names a record the device does not have. */
export class MissingRecordError extends Error {
  constructor(what: string) {
    super(`That ${what} is not on this device any more.`);
    this.name = 'MissingRecordError';
  }
}

async function create<T extends RecordFields>(store: RecordStore, draft: Draft<T>): Promise<T> {
  void ensurePersistentStorage();
  const stamp = nowIso();
  const record = { ...draft, _id: ulid(), createdAt: stamp, updatedAt: stamp, deletedAt: null } as unknown as T;
  await putOne(store, record);
  return record;
}

async function update<T extends RecordFields>(store: RecordStore, id: string, patch: Partial<Draft<T>>, what: string): Promise<T> {
  void ensurePersistentStorage();
  const existing = await getOne<T>(store, id);
  if (!existing || existing.deletedAt) throw new MissingRecordError(what);
  // The record fields belong to the repository; a patch can't move them.
  const { _id, createdAt, updatedAt, deletedAt, ...content } = patch as Partial<T>;
  void _id; void createdAt; void updatedAt; void deletedAt;
  const next = { ...existing, ...content, updatedAt: nowIso() } as T;
  await putOne(store, next);
  return next;
}

async function tombstone(store: RecordStore, id: string): Promise<void> {
  const existing = await getOne<RecordFields>(store, id);
  if (!existing || existing.deletedAt) return;
  const stamp = nowIso();
  await putOne(store, { ...existing, deletedAt: stamp, updatedAt: stamp });
}

/** Clears a tombstone: the inverse of a delete, for Undo. */
async function untombstone(store: RecordStore, id: string, what: string): Promise<void> {
  const existing = await getOne<RecordFields>(store, id);
  if (!existing) throw new MissingRecordError(what);
  if (!existing.deletedAt) return;
  await putOne(store, { ...existing, deletedAt: null, updatedAt: nowIso() });
}

/** Tidies photographs nobody uses any more, after the write that orphaned them has landed. */
const tidyPhotos = () => {
  void collectPhotoGarbage().catch(() => undefined);
};

/** Makes sure each named folder exists as a record. "Uncategorized" is the absence of one. */
export async function registerFolders(names: (string | undefined)[]) {
  const existing = new Set(live(await getAll<Folder>('folders')).map((f) => f.name.toLowerCase()));
  for (const name of names) {
    const folder = name?.trim();
    if (!folder || folder === 'Uncategorized' || existing.has(folder.toLowerCase())) continue;
    existing.add(folder.toLowerCase());
    await create<Folder>('folders', { name: folder });
  }
}

const registerFolder = (name: string | undefined) => registerFolders([name]);

export interface NewBakePhoto {
  file: Blob;
  label: string;
}

export const repo = {
  /* ── Recipes ─────────────────────────────────────────────────────────── */

  async getRecipes(): Promise<Recipe[]> {
    return live(await getAll<Recipe>('recipes')).sort(newest);
  },

  /** null when the device has no such recipe, or it was deleted. */
  async getRecipe(id: string): Promise<Recipe | null> {
    const recipe = await getOne<Recipe>('recipes', id);
    return recipe && !recipe.deletedAt ? recipe : null;
  },

  async createRecipe(draft: Draft<Recipe>): Promise<Recipe> {
    const recipe = await create<Recipe>('recipes', draft);
    await registerFolder(recipe.folder);
    return recipe;
  },

  async updateRecipe(id: string, patch: Partial<Draft<Recipe>>): Promise<Recipe> {
    const recipe = await update<Recipe>('recipes', id, patch, 'recipe');
    await registerFolder(recipe.folder);
    if (patch.imageUrls) tidyPhotos();
    return recipe;
  },

  async deleteRecipe(id: string): Promise<void> {
    await tombstone('recipes', id);
    tidyPhotos();
  },

  /**
   * Saves a recipe from the shared cookbook into this cookbook as an editable
   * copy that remembers where it came from. Its photograph is brought onto the
   * device where the host allows it, so the copy works offline.
   */
  async forkPublished(published: PublishedRecipe): Promise<Recipe> {
    const imageUrls = await Promise.all((published.imageUrls ?? []).slice(0, 1).map(adoptRemotePhoto));
    return repo.createRecipe({
      title: published.title,
      description: published.description,
      imageUrls,
      servings: published.servings ?? 4,
      difficulty: published.difficulty || undefined,
      prepTime: published.prepTime,
      cookTime: published.cookTime,
      tags: published.tags ?? [],
      ingredients: published.ingredients ?? [],
      instructions: published.instructions ?? [],
      instructionLinks: [],
      labNotes: '',
      folder: published.folder || 'Uncategorized',
      forkedFrom: {
        publishedId: published._id,
        slug: published.slug,
        authorHandle: published.authorHandle,
        title: published.title,
      },
    });
  },

  /* ── Bake logs ───────────────────────────────────────────────────────── */

  /** Every bake, newest first. */
  async getBakeLogs(): Promise<BakeLog[]> {
    return live(await getAll<BakeLog>('bakeLogs')).sort((a, b) => b.date.localeCompare(a.date));
  },

  async getRecipeBakeLogs(recipeId: string): Promise<BakeLog[]> {
    return live(await getByIndex<BakeLog>('bakeLogs', 'recipeId', recipeId)).sort((a, b) => b.date.localeCompare(a.date));
  },

  async createBakeLog(
    draft: { recipeId: string; notes: string; date?: string; isPersonalBest?: boolean },
    photos: NewBakePhoto[] = [],
  ): Promise<BakeLog> {
    const images = [];
    for (const p of photos) images.push({ url: await savePhoto(p.file), label: p.label });
    return create<BakeLog>('bakeLogs', {
      recipeId: draft.recipeId,
      notes: draft.notes,
      date: draft.date ?? nowIso(),
      isPersonalBest: draft.isPersonalBest ?? false,
      images,
      imageUrls: images.map((i) => i.url),
    });
  },

  async updateBakeLog(id: string, patch: Partial<Draft<BakeLog>>): Promise<BakeLog> {
    // The labelled list is the one people edit; the plain list follows it.
    const next = patch.images ? { ...patch, imageUrls: patch.images.map((i) => i.url) } : patch;
    const log = await update<BakeLog>('bakeLogs', id, next, 'bake log');
    if (patch.images || patch.imageUrls) tidyPhotos();
    return log;
  },

  async deleteBakeLog(id: string): Promise<void> {
    await tombstone('bakeLogs', id);
    tidyPhotos();
  },

  /* ── Pantry ──────────────────────────────────────────────────────────── */

  async getPantry(): Promise<PantryItem[]> {
    return live(await getAll<PantryItem>('pantry')).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async addPantryItem(item: { name: string }): Promise<PantryItem> {
    return create<PantryItem>('pantry', { name: item.name.trim() });
  },

  async deletePantryItem(id: string): Promise<void> {
    await tombstone('pantry', id);
  },

  /* ── Notes ───────────────────────────────────────────────────────────── */

  async getNotes(): Promise<Note[]> {
    return live(await getAll<Note>('notes')).sort(newest);
  },

  async createNote(note: { title: string; content: string }): Promise<Note> {
    return create<Note>('notes', note);
  },

  async updateNote(id: string, patch: { title?: string; content?: string }): Promise<Note> {
    return update<Note>('notes', id, patch, 'note');
  },

  async deleteNote(id: string): Promise<void> {
    await tombstone('notes', id);
  },

  /* ── Folders ─────────────────────────────────────────────────────────── */

  async getFolders(): Promise<Folder[]> {
    return live(await getAll<Folder>('folders')).sort((a, b) => a.name.localeCompare(b.name));
  },

  /* ── Undo ────────────────────────────────────────────────────────────── */

  /**
   * Brings a deleted record back. Its photographs are still there: the
   * photo collector counts a record deleted within the last hour as live.
   */
  async restore(store: RecordStore, id: string): Promise<void> {
    const what = store === 'bakeLogs' ? 'bake log' : store === 'pantry' ? 'pantry item' : store.replace(/s$/, '');
    await untombstone(store, id, what);
  },
};

export type Repo = typeof repo;
