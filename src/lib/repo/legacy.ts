/*
 * Bringing the server library onto this device.
 *
 * Before Phase 1 every recipe, bake log, note and pantry item lived on the
 * server. That library belongs to the operator, and moving it onto the
 * operator's own device is the one-time step that makes the local cookbook
 * theirs. It keeps every record's id, so links and bake-log references still
 * resolve, and merges like an import: run it twice and nothing doubles.
 */
import { api, type ServerLibrary } from '../api';
import { mergeRecords, type ImportResult } from './backup';
import { registerFolders } from './index';

type Raw = Record<string, unknown>;

const idOf = (value: unknown): string =>
  typeof value === 'object' && value !== null && '_id' in value ? String((value as Raw)._id) : String(value);

const timesOf = (doc: Raw) => {
  const createdAt = typeof doc.createdAt === 'string' ? doc.createdAt : new Date(0).toISOString();
  const updatedAt = typeof doc.updatedAt === 'string' ? doc.updatedAt : createdAt;
  const deletedAt = typeof doc.deletedAt === 'string' ? doc.deletedAt : null;
  return { createdAt, updatedAt, deletedAt };
};

/** Fields the server added or the removed versioning system left behind. */
const SERVER_ONLY = ['__v', 'commitMessage', 'isLatestVersion', 'parentRecipeId', 'versionNumber'];

const strip = (doc: Raw) => {
  const out: Raw = { ...doc };
  for (const k of SERVER_ONLY) delete out[k];
  return out;
};

export function toLocalRecords(library: ServerLibrary) {
  const recipes = (library.recipes as Raw[]).map((doc) => ({
    ...strip(doc),
    _id: idOf(doc._id),
    ...timesOf(doc),
    instructionLinks: Array.isArray(doc.instructionLinks)
      ? (doc.instructionLinks as Raw[]).map((l) => ({ ...strip(l), recipeId: idOf(l.recipeId) }))
      : [],
  }));
  const bakeLogs = (library.bakeLogs as Raw[]).map((doc) => {
    const images = Array.isArray(doc.images) ? (doc.images as { url: string; label: string }[]) : [];
    const imageUrls = Array.isArray(doc.imageUrls) ? (doc.imageUrls as string[]) : [];
    return {
      ...strip(doc),
      _id: idOf(doc._id),
      recipeId: idOf(doc.recipeId),
      // Older bakes filled only one of the two lists; the device keeps both in step.
      images: images.length > 0 ? images : imageUrls.map((url) => ({ url, label: '' })),
      imageUrls: images.length > 0 ? images.map((i) => i.url) : imageUrls,
      ...timesOf(doc),
    };
  });
  const notes = (library.notes as Raw[]).map((doc) => ({ ...strip(doc), _id: idOf(doc._id), ...timesOf(doc) }));
  const pantry = (library.pantry as Raw[]).map((doc) => ({ ...strip(doc), _id: idOf(doc._id), ...timesOf(doc) }));
  return { recipes, bakeLogs, notes, pantry };
}

export async function importServerLibrary(): Promise<ImportResult> {
  const library = await api.getServerLibrary();
  const local = toLocalRecords(library);
  const result: ImportResult = { added: 0, updated: 0, unchanged: 0, photos: 0 };
  await mergeRecords('recipes', local.recipes, result);
  await mergeRecords('bakeLogs', local.bakeLogs, result);
  await mergeRecords('notes', local.notes, result);
  await mergeRecords('pantry', local.pantry, result);
  await registerFolders((library.recipes as Raw[]).map((r) => (typeof r.folder === 'string' ? r.folder : undefined)));
  return result;
}
