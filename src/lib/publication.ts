/*
 * A recipe on this device, and its copy in the shared cookbook.
 *
 * The copy is a snapshot (LAUNCH_PLAN.md §1), so the two drift apart the
 * moment the recipe is edited. The snapshot remembers the recipe's updatedAt
 * when it was taken; a later one on the device means edits not yet pushed.
 */
import type { PublishBody } from './api';
import type { Publication, Recipe } from './types';
import { getPhotoBlob, isPhotoRef } from './repo/photos';
import { blobToDataUrl } from './image';

export type PublicationState = 'local' | 'pending' | 'live' | 'edits' | 'rejected';

export function publicationState(recipe: Pick<Recipe, 'updatedAt'>, publication: Publication | undefined): PublicationState {
  if (!publication || publication.unpublishedAt) return 'local';
  if (publication.moderation.state === 'rejected') return 'rejected';
  if (publication.moderation.state === 'pending') return 'pending';
  const pushedAt = publication.sourceUpdatedAt ? Date.parse(publication.sourceUpdatedAt) : 0;
  return Date.parse(recipe.updatedAt) > pushedAt ? 'edits' : 'live';
}

/** "someblog.com" from "https://www.someblog.com/rye": a credit to start from, never invented beyond the address. */
export function creditFromUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}


/**
 * The photographs as the server takes them: one stored on this device goes as
 * data (it is already compressed), a web address goes as itself — the server
 * keeps only the author's own, and says how many stayed behind.
 */
export async function photosForPublishing(refs: string[], max = 3): Promise<string[]> {
  const out: string[] = [];
  for (const ref of refs.slice(0, max)) {
    if (isPhotoRef(ref)) {
      const blob = await getPhotoBlob(ref);
      if (blob) out.push(await blobToDataUrl(blob));
    } else if (ref) {
      out.push(ref);
    }
  }
  return out;
}

/** How many of a recipe's photographs are the author's own, from this device. */
export const devicePhotoCount = (refs: string[]) => refs.slice(0, 3).filter((r) => isPhotoRef(r)).length;

export async function publishBody(
  recipe: Recipe,
  credit: { sourceAttribution: string; ownWords: boolean },
): Promise<PublishBody> {
  return {
    sourceLocalId: recipe._id,
    sourceUpdatedAt: recipe.updatedAt,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    tags: recipe.tags,
    folder: recipe.folder,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    photos: await photosForPublishing(recipe.imageUrls ?? []),
    sourceUrl: recipe.sourceUrl,
    sourceAttribution: credit.sourceAttribution.trim() || undefined,
    ownWords: credit.ownWords,
    forkedFrom: recipe.forkedFrom
      ? { publishedId: recipe.forkedFrom.publishedId, authorHandle: recipe.forkedFrom.authorHandle, title: recipe.forkedFrom.title }
      : null,
  };
}
