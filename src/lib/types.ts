/*
 * The cookbook's records.
 *
 * These live on the device, in IndexedDB (src/lib/repo). Every record carries
 * a client-minted id and the three fields sync will need in Phase 4 —
 * `createdAt`, `updatedAt` and a `deletedAt` tombstone — even though nothing
 * syncs yet: retrofitting them later means rewriting every record.
 *
 * Photograph references (`imageUrls`, `images[].url`) are either a web address
 * or `photo:<id>`, a compressed image held in the device's photo store.
 * `usePhotoSrc` turns either into something an <img> can draw.
 */

export interface RecordFields {
  _id: string;
  createdAt: string;
  updatedAt: string;
  /** Set when the record is deleted. The record stays as a tombstone for sync. */
  deletedAt: string | null;
}

/** What a caller supplies; the repository fills in the record fields. */
export type Draft<T extends RecordFields> = Omit<T, keyof RecordFields>;

export interface Component {
  name: string;
  /** null when there is no amount: "to serve", "to taste". */
  quantity: number | null;
  /** '' for a plain count: "2 eggs". */
  unit: string;
}

export interface InstructionLink {
  stepIndex: number;
  recipeId: string;
  recipeTitle: string;
}

/** Where a recipe saved from the shared cookbook came from. */
export interface ForkedFrom {
  publishedId: string;
  slug: string;
  authorHandle: string;
  title: string;
}

export interface Recipe extends RecordFields {
  title: string;
  description: string;
  imageUrls: string[];
  servings: number;
  difficulty?: string;
  prepTime: string;
  cookTime: string;
  tags: string[];
  ingredients: Component[];
  instructions: string[];
  instructionLinks?: InstructionLink[];
  labNotes?: string;
  folder?: string;
  forkedFrom?: ForkedFrom | null;
  sourceUrl?: string;
}

export interface BakePhoto {
  url: string;
  label: string;
}

/** A note jotted mid-bake, tied to the step it was about. */
export interface StepNote {
  /** Index into the recipe's `instructions`, the same index baking mode uses. */
  stepIndex: number;
  text: string;
  /** ISO timestamp of when it was written. */
  at: string;
}

export interface BakeLog extends RecordFields {
  recipeId: string;
  date: string;
  isPersonalBest?: boolean;
  notes: string;
  imageUrls: string[];
  images?: BakePhoto[];
  /** 1–5 stars; absent or null when the baker didn't say. */
  rating?: number | null;
  /** What was done differently this time. */
  changes?: string;
  /** A note to the next attempt, shown when the recipe is next opened. */
  nextTime?: string;
  /** Notes written during the bake, each on the step it was about. */
  stepNotes?: StepNote[];
}

export interface Note extends RecordFields {
  title: string;
  content: string;
}

export interface PantryItem extends RecordFields {
  name: string;
}

/** A line on the shopping list (Shop → To buy). */
export interface ShoppingItem extends RecordFields {
  name: string;
  /** null for "to taste": there is no measure to buy. */
  quantity: number | null;
  unit: string;
  checked: boolean;
  /** The recipe it was added from, if any. */
  recipeId?: string;
  recipeTitle?: string;
}

export interface Folder extends RecordFields {
  name: string;
}

export interface PublishedStats {
  saves: number;
  bakedCount: number;
  ratingSum: number;
  ratingCount: number;
}

/** A recipe in the shared cookbook, as the server publishes it. */
export interface PublishedRecipe {
  _id: string;
  slug: string;
  title: string;
  description: string;
  imageUrls: string[];
  servings: number | null;
  difficulty: string;
  prepTime: string;
  cookTime: string;
  tags: string[];
  folder: string;
  ingredients?: Component[];
  instructions?: string[];
  authorHandle: string;
  sourceUrl?: string;
  sourceAttribution: string;
  forkedFrom?: { publishedId: string; authorHandle: string; title: string } | null;
  featured?: boolean;
  stats?: PublishedStats;
  publishedAt: string;
  updatedAt?: string;
}

export type ModerationState = 'approved' | 'pending' | 'rejected';

/** One of the signed-in author's own published copies, in any state (B6, B7). */
export interface Publication extends PublishedRecipe {
  sourceLocalId: string;
  sourceUpdatedAt: string | null;
  moderation: { state: ModerationState; reason: string };
  unpublishedAt: string | null;
}

export interface PublishedComment {
  _id: string;
  authorHandle: string;
  body: string;
  createdAt: string;
  pending: boolean;
  mine: boolean;
}

export interface Profile {
  profile: { handle: string; displayName: string; bio: string; pro: boolean; moderator?: boolean; joinedAt: string | null };
  recipes: PublishedRecipe[];
  stats: { published: number; baked: number };
}
