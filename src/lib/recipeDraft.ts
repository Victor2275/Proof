import type { Draft, Recipe } from './types';

/*
 * The recipe being written, kept as it is typed.
 *
 * Leaving the editor without saving used to throw the form away. Now every
 * change is kept on this device — one draft for a new recipe, one per recipe
 * being edited — until it is saved or discarded. Reopening the editor picks
 * the draft up where it was left.
 *
 * localStorage, like the running bake: a draft is this device's unfinished
 * work, not a record, and it never syncs. Photographs in a draft are already
 * in the photo store (`savePhoto`); the photo sweep counts drafts as using them.
 */

const PREFIX = 'proof.draft:';
const NEW = 'new';

export interface RecipeDraft {
  recipe: Draft<Recipe>;
  /** ISO time of the last change. */
  savedAt: string;
  /** For an edit: the stored recipe's `updatedAt` when the draft began, to tell if it has changed since. */
  baseUpdatedAt?: string;
}

/** The draft's slot: the recipe's id, or "new". */
export const draftKeyFor = (id?: string) => id ?? NEW;

export function readRecipeDraft(key: string): RecipeDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.recipe || typeof parsed.savedAt !== 'string') return null;
    return parsed as RecipeDraft;
  } catch {
    return null;
  }
}

export function saveRecipeDraft(key: string, recipe: Draft<Recipe>, baseUpdatedAt?: string): void {
  const draft: RecipeDraft = { recipe, savedAt: new Date().toISOString(), ...(baseUpdatedAt ? { baseUpdatedAt } : {}) };
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the form still works, it just isn't kept.
  }
}

export function clearRecipeDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clear where storage is blocked.
  }
}

/** Every draft on this device, for the photo sweep. */
export function allRecipeDrafts(): RecipeDraft[] {
  const drafts: RecipeDraft[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const draft = readRecipeDraft(key.slice(PREFIX.length));
      if (draft) drafts.push(draft);
    }
  } catch {
    // Storage blocked: no drafts.
  }
  return drafts;
}

/** The same recipe, field for field: an edit that was undone by hand is no draft. */
export const sameRecipe = (a: Draft<Recipe>, b: Draft<Recipe>) => JSON.stringify(a) === JSON.stringify(b);
