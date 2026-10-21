/*
 * Applies the editorial review of the seeded library (data/library-edits.json)
 * to a recipe.
 *
 * The mechanical repairs live in recipeCleanup.ts. This adds what needed a
 * reader: real timings, servings and difficulty, a description that describes
 * the dish, and a method rewritten where the source's could not be cooked from
 * as written. Each entry also says whether the recipe is fit to publish, and
 * why not when it isn't.
 *
 * Step and ingredient indices in an entry refer to the *cleaned* lists, the
 * ones cleanInstructions and cleanIngredients produce, which is what the
 * reviewer read.
 */
import { cleanIngredients, cleanInstructions, type Ingredient } from './recipeCleanup.js';

export interface LibraryEdit {
  /** The recipe's updatedAt when it was reviewed. A later edit means the review no longer applies. */
  basis?: string;
  prep?: number;
  cook?: number;
  serves?: number;
  difficulty?: string;
  description?: string;
  title?: string;
  /** A title used only on the published copy, e.g. to drop a brand name. */
  publishTitle?: string;
  folder?: string;
  tags?: string[];
  publish?: boolean;
  reason?: string;
  /** Offered on a stranger's empty cookbook as a first thing to save. */
  featured?: boolean;
  instructions?: string[];
  ingredients?: Ingredient[];
  replaceSteps?: Record<string, string>;
  dropSteps?: number[];
  addSteps?: string[];
  patchIngredients?: Record<string, Partial<Ingredient>>;
  addIngredients?: Ingredient[];
}

export interface SourceRecipe {
  _id: unknown;
  title: string;
  description?: string;
  imageUrls?: string[];
  servings?: number;
  difficulty?: string;
  prepTime?: string;
  cookTime?: string;
  tags?: string[];
  folder?: string;
  ingredients?: { name: string; quantity: number | null; unit: string }[];
  instructions?: string[];
  updatedAt?: Date | string;
}

export interface CuratedRecipe {
  title: string;
  description: string;
  servings: number;
  difficulty: string;
  prepTime: string;
  cookTime: string;
  tags: string[];
  folder: string;
  ingredients: Ingredient[];
  instructions: string[];
}

export type Curation =
  | { status: 'curated'; fields: CuratedRecipe; publish: boolean; publishTitle: string; featured: boolean; reason?: string }
  | { status: 'skipped'; reason: string };

const iso = (value: Date | string | undefined) => (value ? new Date(value).toISOString() : '');

export function curateRecipe(recipe: SourceRecipe, edit: LibraryEdit | undefined): Curation {
  if (!edit) return { status: 'skipped', reason: 'No editorial entry: the recipe was added after the review.' };
  if (edit.basis && iso(recipe.updatedAt) !== iso(edit.basis)) {
    return { status: 'skipped', reason: 'Edited since the review, so the review no longer applies to it.' };
  }

  const title = edit.title ?? recipe.title;

  let instructions = edit.instructions ?? cleanInstructions(recipe.instructions ?? [], recipe.title);
  if (!edit.instructions) {
    const replaced = instructions.map((step, i) => edit.replaceSteps?.[String(i)] ?? step);
    const dropped = new Set(edit.dropSteps ?? []);
    instructions = replaced.filter((_, i) => !dropped.has(i));
  }
  instructions = [...instructions, ...(edit.addSteps ?? [])];

  let ingredients = edit.ingredients ?? cleanIngredients(recipe.ingredients ?? []);
  if (!edit.ingredients) {
    ingredients = ingredients.map((ing, i) => ({ ...ing, ...(edit.patchIngredients?.[String(i)] ?? {}) }));
  }
  ingredients = [...ingredients, ...(edit.addIngredients ?? [])];

  const fields: CuratedRecipe = {
    title,
    description: edit.description ?? recipe.description ?? '',
    servings: edit.serves ?? recipe.servings ?? 4,
    difficulty: edit.difficulty ?? recipe.difficulty ?? 'Medium',
    // The app's own convention: whole minutes as a bare number.
    prepTime: edit.prep !== undefined ? String(edit.prep) : (recipe.prepTime ?? ''),
    cookTime: edit.cook !== undefined ? String(edit.cook) : (recipe.cookTime ?? ''),
    tags: edit.tags ?? recipe.tags ?? [],
    folder: edit.folder ?? recipe.folder ?? 'Uncategorized',
    ingredients,
    instructions,
  };

  return {
    status: 'curated',
    fields,
    publish: edit.publish !== false,
    publishTitle: edit.publishTitle ?? title,
    featured: edit.featured === true,
    reason: edit.reason,
  };
}

/** A URL slug: lower case, ASCII, hyphenated. "Æbleskiver" → "aebleskiver". */
export function slugify(title: string): string {
  return title
    .replace(/æ/gi, 'ae')
    .replace(/ø/gi, 'o')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '') || 'recipe';
}

/** Private state that never travels with a published copy. */
export const PRIVATE_TAGS = new Set(['favorite']);

export const publicTags = (tags: string[]) => tags.filter((t) => !PRIVATE_TAGS.has(t.toLowerCase()));
