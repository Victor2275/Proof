/*
 * Publishing a recipe to the shared cookbook (LAUNCH_PLAN.md, Phase 3).
 *
 * Publishing copies, it does not flag: the server keeps a snapshot, keyed by
 * the author and the id of the recipe on their device, so publishing the same
 * recipe again is "push update" — the same address, a new snapshot — and
 * editing the recipe on the device never changes the public page by itself.
 */
import { v2 as cloudinary } from 'cloudinary';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { Rating } from '../models/Rating.js';
import { cloudinaryConfigured, isCloudinaryUrl } from './cloudinary.js';
import { publicTags, slugify } from './libraryCuration.js';
import { screenRecipe } from './moderation.js';

export class PublishError extends Error {
  status: number;
  field?: string;
  constructor(message: string, status = 400, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const DATA_URL = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface Submission {
  sourceLocalId: string;
  sourceUpdatedAt: string | null;
  title: string;
  description: string;
  servings: number | null;
  difficulty: string;
  prepTime: string;
  cookTime: string;
  tags: string[];
  folder: string;
  ingredients: { name: string; quantity: number | null; unit: string }[];
  instructions: string[];
  photos: string[];
  sourceUrl: string;
  sourceAttribution: string;
  ownWords: boolean;
  forkedFrom: { publishedId: string; authorHandle: string; title: string } | null;
}

/** Shapes and bounds what a client sent; throws a PublishError naming the field. */
export function readSubmission(body: any): Submission {
  const title = text(body?.title, 120);
  if (!title) throw new PublishError('A published recipe needs a title.', 400, 'title');
  if (typeof body?.sourceLocalId !== 'string' || !/^[\w-]{1,64}$/.test(body.sourceLocalId)) {
    throw new PublishError('That recipe has no id to publish under.', 400);
  }

  const ingredients = (Array.isArray(body.ingredients) ? body.ingredients : [])
    .slice(0, 100)
    .map((i: any) => ({
      name: text(i?.name, 200),
      quantity: typeof i?.quantity === 'number' && Number.isFinite(i.quantity) ? i.quantity : null,
      unit: text(i?.unit, 40),
    }))
    .filter((i: { name: string }) => i.name);
  const instructions = (Array.isArray(body.instructions) ? body.instructions : [])
    .slice(0, 80)
    .map((s: unknown) => text(s, 2000))
    .filter(Boolean);
  if (ingredients.length === 0 || instructions.length === 0) {
    throw new PublishError('A published recipe needs its ingredients and its method.', 400, 'body');
  }

  const sourceUrl = text(body.sourceUrl, 500);
  const sourceAttribution = text(body.sourceAttribution, 120);
  const ownWords = body.ownWords === true;
  // The attribution rule: an imported recipe carries its credit, or the author
  // says the words are theirs. Ingredient lists aren't anyone's; prose is.
  if (sourceUrl && !sourceAttribution && !ownWords) {
    throw new PublishError(
      'This recipe was imported from another site. Credit the source, or confirm the method and description are in your own words.',
      400,
      'sourceAttribution',
    );
  }

  const forked = body.forkedFrom;
  return {
    sourceLocalId: body.sourceLocalId,
    sourceUpdatedAt: typeof body.sourceUpdatedAt === 'string' ? body.sourceUpdatedAt : null,
    title,
    description: text(body.description, 1000),
    servings: typeof body.servings === 'number' && body.servings > 0 ? Math.min(Math.round(body.servings), 500) : null,
    difficulty: text(body.difficulty, 20),
    prepTime: text(body.prepTime, 40),
    cookTime: text(body.cookTime, 40),
    tags: publicTags((Array.isArray(body.tags) ? body.tags : []).map((t: unknown) => text(t, 40)).filter(Boolean)).slice(0, 12),
    folder: text(body.folder, 60),
    ingredients,
    instructions,
    photos: (Array.isArray(body.photos) ? body.photos : []).filter((p: unknown) => typeof p === 'string').slice(0, MAX_PHOTOS),
    sourceUrl,
    sourceAttribution,
    ownWords,
    forkedFrom: forked && typeof forked.publishedId === 'string'
      ? { publishedId: forked.publishedId, authorHandle: text(forked.authorHandle, 24), title: text(forked.title, 120) }
      : null,
  };
}

/*
 * Photographs travel with a published recipe only when they are the author's:
 * one taken on their device (sent as data, uploaded here) or one already in
 * the shared cookbook. A picture hot-linked from another site is someone
 * else's photograph and stays behind.
 */
export async function publishablePhotos(photos: string[]) {
  const kept: string[] = [];
  let dropped = 0;
  for (const photo of photos) {
    if (isCloudinaryUrl(photo)) {
      kept.push(photo);
      continue;
    }
    const match = photo.match(DATA_URL);
    if (!match || !cloudinaryConfigured() || Buffer.byteLength(match[2], 'base64') > MAX_PHOTO_BYTES) {
      dropped++;
      continue;
    }
    try {
      const result = await cloudinary.uploader.upload(photo, { folder: 'published' });
      kept.push(result.secure_url);
    } catch {
      dropped++;
    }
  }
  return { kept, dropped };
}

async function uniqueSlug(title: string, exceptId?: string) {
  const base = slugify(title);
  let slug = base;
  for (let n = 2; await PublishedRecipe.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function publish(author: { _id: string; handle: string }, submission: Submission) {
  const existing = await PublishedRecipe.findOne({ authorId: author._id, sourceLocalId: submission.sourceLocalId });
  const { kept, dropped } = await publishablePhotos(submission.photos);
  const screen = await screenRecipe(submission);
  const now = new Date();

  const content = {
    authorId: author._id,
    authorHandle: author.handle,
    sourceLocalId: submission.sourceLocalId,
    title: submission.title,
    description: submission.description,
    imageUrls: kept,
    servings: submission.servings,
    difficulty: submission.difficulty,
    prepTime: submission.prepTime,
    cookTime: submission.cookTime,
    tags: submission.tags,
    folder: submission.folder,
    ingredients: submission.ingredients,
    instructions: submission.instructions,
    forkedFrom: submission.forkedFrom,
    sourceUrl: submission.sourceUrl,
    sourceAttribution: submission.sourceAttribution,
    ownWords: submission.ownWords,
    sourceUpdatedAt: submission.sourceUpdatedAt ? new Date(submission.sourceUpdatedAt) : now,
    moderation: {
      state: screen.verdict === 'approve' ? 'approved' : 'pending',
      reason: screen.reason,
      checkedAt: now,
    },
    unpublishedAt: null,
  };

  let doc;
  if (existing) {
    // A new title keeps the address: links already shared must still work.
    Object.assign(existing, content);
    doc = await existing.save();
  } else {
    doc = await PublishedRecipe.create({ ...content, slug: await uniqueSlug(submission.title), publishedAt: now });
  }
  return { recipe: doc, droppedPhotos: dropped };
}

/** Recounts a recipe's ratings and bakes from the ratings themselves. */
export async function recountRatings(publishedId: string) {
  const [stats] = await Rating.aggregate([
    { $match: { publishedId } },
    {
      $group: {
        _id: null,
        ratingSum: { $sum: { $ifNull: ['$stars', 0] } },
        ratingCount: { $sum: { $cond: [{ $gt: ['$stars', null] }, 1, 0] } },
        bakedCount: { $sum: { $cond: ['$baked', 1, 0] } },
      },
    },
  ]);
  await PublishedRecipe.updateOne(
    { _id: publishedId },
    {
      $set: {
        'stats.ratingSum': stats?.ratingSum ?? 0,
        'stats.ratingCount': stats?.ratingCount ?? 0,
        'stats.bakedCount': stats?.bakedCount ?? 0,
      },
    },
  );
}

/** What a stranger may see of a published recipe: no author id, local id or moderation notes. */
export function publicRecipe(doc: any) {
  const r = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    _id: r._id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    imageUrls: r.imageUrls,
    servings: r.servings,
    difficulty: r.difficulty,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    tags: r.tags,
    folder: r.folder,
    ingredients: r.ingredients,
    instructions: r.instructions,
    authorHandle: r.authorHandle,
    sourceUrl: r.sourceUrl,
    sourceAttribution: r.sourceAttribution,
    forkedFrom: r.forkedFrom ?? null,
    featured: r.featured,
    stats: r.stats,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
  };
}

/** What the author sees of their own copy: the public view plus its state. */
export function ownRecipe(doc: any) {
  const r = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...publicRecipe(r),
    sourceLocalId: r.sourceLocalId,
    sourceUpdatedAt: r.sourceUpdatedAt,
    moderation: { state: r.moderation?.state, reason: r.moderation?.reason ?? '' },
    unpublishedAt: r.unpublishedAt,
  };
}
