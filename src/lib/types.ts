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

export interface BakeLog extends RecordFields {
  recipeId: string;
  date: string;
  isPersonalBest?: boolean;
  notes: string;
  imageUrls: string[];
  images?: BakePhoto[];
}

export interface Note extends RecordFields {
  title: string;
  content: string;
}

export interface PantryItem extends RecordFields {
  name: string;
}

export interface Folder extends RecordFields {
  name: string;
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
  sourceAttribution: string;
  featured?: boolean;
  publishedAt: string;
}
