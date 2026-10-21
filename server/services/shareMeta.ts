/*
 * What a shared link says before anyone opens it (LAUNCH_PLAN.md, Phase 3
 * item 9): a title, a description and a picture for a chat preview, and
 * schema.org Recipe data so a search engine can show the recipe as a rich
 * result. Each published recipe becomes a page that brings people in.
 *
 * Everything here is someone's text going into HTML, so every value is
 * escaped, and the JSON-LD has its "<" escaped so no field can close the tag.
 */
import type { PageHead } from './indexHtml.js';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const meta = (attr: 'name' | 'property', key: string, content: string) =>
  content ? `<meta ${attr}="${key}" content="${escapeHtml(content)}">` : '';

/** "1 hr 30 mins" → 90; a bare number is minutes; null when it can't be read. */
export function minutesOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = value.toLowerCase().trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text));
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  const mins = text.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  if (!hours && !mins) return null;
  return Math.round((hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0));
}

const isoDuration = (minutes: number | null) =>
  minutes ? `PT${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}H` : ''}${minutes % 60 ? `${minutes % 60}M` : ''}` : undefined;

/** The seed script's placeholder pair is not a measurement, so it is not published as one. */
const isPlaceholder = (prep: string, cook: string) => prep === '20 mins' && cook === '30 mins';

export interface ShareableRecipe {
  slug: string;
  title: string;
  description: string;
  imageUrls: string[];
  servings: number | null;
  prepTime: string;
  cookTime: string;
  tags: string[];
  ingredients: { name: string; quantity: number | null; unit: string }[];
  instructions: string[];
  authorHandle: string;
  publishedAt?: Date | string;
  stats?: { ratingSum: number; ratingCount: number };
}

const ingredientLine = (i: ShareableRecipe['ingredients'][number]) =>
  [i.quantity ?? '', i.unit, i.name].filter((x) => x !== '' && x !== null).join(' ');

export function recipeHead(recipe: ShareableRecipe, origin: string): PageHead {
  const url = `${origin}/r/${recipe.slug}`;
  const description = recipe.description || `${recipe.title}, shared by @${recipe.authorHandle} on Proof.`;
  const image = recipe.imageUrls[0] ?? '';
  const placeholder = isPlaceholder(recipe.prepTime, recipe.cookTime);
  const prep = placeholder ? null : minutesOf(recipe.prepTime);
  const cook = placeholder ? null : minutesOf(recipe.cookTime);
  const total = prep !== null || cook !== null ? (prep ?? 0) + (cook ?? 0) : null;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description,
    url,
    image: image ? [image] : undefined,
    author: { '@type': 'Person', name: `@${recipe.authorHandle}`, url: `${origin}/@${recipe.authorHandle}` },
    datePublished: recipe.publishedAt ? new Date(recipe.publishedAt).toISOString().slice(0, 10) : undefined,
    recipeYield: recipe.servings ? `${recipe.servings} servings` : undefined,
    prepTime: isoDuration(prep),
    cookTime: isoDuration(cook),
    totalTime: isoDuration(total),
    keywords: recipe.tags.join(', ') || undefined,
    recipeIngredient: recipe.ingredients.map(ingredientLine),
    recipeInstructions: recipe.instructions.map((text) => ({ '@type': 'HowToStep', text })),
    aggregateRating: recipe.stats && recipe.stats.ratingCount > 0
      ? {
        '@type': 'AggregateRating',
        ratingValue: Number((recipe.stats.ratingSum / recipe.stats.ratingCount).toFixed(1)),
        ratingCount: recipe.stats.ratingCount,
      }
      : undefined,
  };

  const tags = [
    meta('name', 'description', description),
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    meta('property', 'og:type', 'article'),
    meta('property', 'og:site_name', 'Proof'),
    meta('property', 'og:title', recipe.title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean);

  return { title: escapeHtml(`${recipe.title} · Proof`), tags: tags.map((t) => `    ${t}`).join('\n') };
}

export function profileHead(
  profile: { handle: string; displayName: string; bio: string },
  stats: { published: number },
  origin: string,
): PageHead {
  const name = profile.displayName ? `${profile.displayName} (@${profile.handle})` : `@${profile.handle}`;
  const description = profile.bio || `${stats.published} ${stats.published === 1 ? 'recipe' : 'recipes'} on Proof.`;
  const url = `${origin}/@${profile.handle}`;
  const tags = [
    meta('name', 'description', description),
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    meta('property', 'og:type', 'profile'),
    meta('property', 'og:site_name', 'Proof'),
    meta('property', 'og:title', name),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
  ].filter(Boolean);
  return { title: escapeHtml(`${name} · Proof`), tags: tags.map((t) => `    ${t}`).join('\n') };
}
