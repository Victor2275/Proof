/*
 * Applies the library review to the database: repairs the operator's own
 * recipes, and seeds the global cookbook with the ones fit to publish.
 *
 * Both writes are idempotent. Re-running the publish updates each snapshot in
 * place (keeping its id, slug, stats and publish date) and unpublishes any
 * recipe the review has since withdrawn.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { curateRecipe, slugify, publicTags, type Curation, type LibraryEdit, type SourceRecipe } from './libraryCuration.js';

export interface PlanEntry {
  id: string;
  rawId: unknown;
  recipe: SourceRecipe;
  curation: Curation;
}

/** Fields from the removed versioning system, still present on every seeded record. */
const VERSIONING_FIELDS = { commitMessage: '', isLatestVersion: '', parentRecipeId: '', versionNumber: '' };

export function planLibrary(recipes: SourceRecipe[], edits: Record<string, LibraryEdit>): PlanEntry[] {
  return recipes.map((recipe) => ({
    id: String(recipe._id),
    rawId: recipe._id,
    recipe,
    curation: curateRecipe(recipe, edits[String(recipe._id)]),
  }));
}

export function summarisePlan(plan: PlanEntry[]) {
  const curated = plan.filter((p) => p.curation.status === 'curated');
  const publish = curated.filter((p) => p.curation.status === 'curated' && p.curation.publish);
  const withheld = curated.filter((p) => p.curation.status === 'curated' && !p.curation.publish);
  const skipped = plan.filter((p) => p.curation.status === 'skipped');
  return {
    total: plan.length,
    curated: curated.length,
    publish: publish.length,
    withheld: withheld.map((p) => ({ title: p.recipe.title, reason: p.curation.status === 'curated' ? p.curation.reason ?? '' : '' })),
    skipped: skipped.map((p) => ({ title: p.recipe.title, reason: p.curation.status === 'skipped' ? p.curation.reason : '' })),
  };
}

/** Writes every document of a collection to an Extended JSON file before anything changes it. */
export async function backupCollection(name: string, dir: string): Promise<string> {
  const docs = await mongoose.connection.collection(name).find({}).toArray();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${name}.json`);
  fs.writeFileSync(file, mongoose.mongo.BSON.EJSON.stringify(docs, undefined, 2, { relaxed: false }));
  return file;
}

/**
 * Repairs the operator's own records in place. It goes through the raw
 * collection rather than the model so it works the same before and after the
 * string-id migration, and so a schema default can't quietly rewrite a field
 * the review didn't touch.
 */
export async function applyLibraryFixes(plan: PlanEntry[]): Promise<number> {
  const recipes = mongoose.connection.collection('recipes');
  let changed = 0;
  for (const entry of plan) {
    if (entry.curation.status !== 'curated') continue;
    const result = await recipes.updateOne(
      { _id: entry.rawId as never },
      { $set: { ...entry.curation.fields, updatedAt: new Date() }, $unset: VERSIONING_FIELDS },
    );
    changed += result.modifiedCount;
  }
  return changed;
}

const attributionFor = (recipe: SourceRecipe) =>
  (recipe.imageUrls ?? []).some((u) => u.includes('themealdb.com')) ? 'TheMealDB' : '';

export interface PublishResult {
  created: number;
  updated: number;
  unpublished: number;
}

export async function publishLibrary(plan: PlanEntry[], { handle }: { handle: string }): Promise<PublishResult> {
  const existing = await PublishedRecipe.find({}).select('_id slug sourceLocalId unpublishedAt').lean();
  const bySource = new Map(existing.map((p) => [p.sourceLocalId, p]));
  const takenSlugs = new Set(existing.map((p) => p.slug));
  const result: PublishResult = { created: 0, updated: 0, unpublished: 0 };
  const now = new Date();

  for (const entry of plan) {
    if (entry.curation.status !== 'curated') continue;
    const current = bySource.get(entry.id);

    if (!entry.curation.publish) {
      if (current && !current.unpublishedAt) {
        await PublishedRecipe.updateOne({ _id: current._id }, { $set: { unpublishedAt: now } });
        result.unpublished++;
      }
      continue;
    }

    const { fields } = entry.curation;
    const content = {
      authorHandle: handle,
      title: entry.curation.publishTitle,
      description: fields.description,
      imageUrls: entry.recipe.imageUrls ?? [],
      servings: fields.servings,
      difficulty: fields.difficulty,
      prepTime: fields.prepTime,
      cookTime: fields.cookTime,
      tags: publicTags(fields.tags),
      folder: fields.folder,
      ingredients: fields.ingredients,
      instructions: fields.instructions,
      sourceAttribution: attributionFor(entry.recipe),
      featured: entry.curation.featured,
      moderation: { state: 'approved', reason: 'Seeded by the operator from the reviewed library.', checkedAt: now },
      unpublishedAt: null,
    };

    if (current) {
      await PublishedRecipe.updateOne({ _id: current._id }, { $set: content });
      result.updated++;
    } else {
      const base = slugify(entry.curation.publishTitle);
      let slug = base;
      for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;
      takenSlugs.add(slug);
      await PublishedRecipe.create({ ...content, slug, sourceLocalId: entry.id, publishedAt: now });
      result.created++;
    }
  }
  return result;
}
