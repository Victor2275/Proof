import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PublishedRecipe, LIVE } from '../models/PublishedRecipe.js';
import { publicUser } from '../services/accounts.js';

/*
 * GET /api/profiles/:handle — a baker's public page (LAUNCH_PLAN.md, Phase 3
 * item 6): who they are, what they have published, how often it has been
 * baked. These are the pages people paste into Discord.
 */
const router = Router();

export const SUMMARY_FIELDS = 'slug title description imageUrls folder tags prepTime cookTime servings difficulty authorHandle sourceAttribution featured stats publishedAt';

/** The profile and its live recipes, or null when there is no such baker. */
export async function loadProfile(rawHandle: string) {
  const handle = rawHandle.replace(/^@/, '').toLowerCase();
  const user = await User.findOne({ handle });
  const recipes = await PublishedRecipe.find({ ...LIVE, authorHandle: handle }).select(SUMMARY_FIELDS).sort({ publishedAt: -1 }).lean();
  // The seeded library is published under a handle that may have no account yet.
  if (!user && recipes.length === 0) return null;
  const baked = recipes.reduce((n, r) => n + (r.stats?.bakedCount ?? 0), 0);
  return {
    profile: user ? publicUser(user) : { handle, displayName: '', bio: '', pro: false, joinedAt: null },
    recipes,
    stats: { published: recipes.length, baked },
  };
}

router.get('/:handle', async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Profiles are unavailable right now.', degraded: true });
  }
  try {
    const profile = await loadProfile(String(req.params.handle));
    if (!profile) return res.status(404).json({ error: 'No baker by that name.' });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
