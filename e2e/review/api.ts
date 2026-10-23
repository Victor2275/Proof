/*
 * The server, as a UI review sees it.
 *
 * One answer table serves both halves of a /ui-review run: the capture spec
 * routes the browser's requests through it, and mock-api.ts puts it on
 * localhost:3001 for the reviewers who walk the app live. A request it does
 * not know returns null, so the caller can log it — an unanswered endpoint is
 * how the 2026-10-21 audit filed "Discover only shows an error" against an app
 * that had no such bug.
 *
 * Pure: no files, no network. The fixtures are passed in.
 */

export interface Answer {
  status: number;
  body: unknown;
}

export interface ReviewServer {
  /** The shared cookbook: what Discover lists and /r/:slug opens. */
  shared: Record<string, unknown>[];
  /** What a URL import or a pasted-text restructure hands back. */
  extracted: Record<string, unknown>;
}

export const REVIEW_TOKEN = 'review-session';

export const REVIEW_ACCOUNT = {
  id: 'acct-review',
  email: 'baker@example.test',
  handle: 'newbaker',
  displayName: 'New Baker',
  bio: '',
  emailVerified: false,
  plan: 'free',
  pro: false,
  joinedAt: '2026-10-21T00:00:00.000Z',
  planExpiresAt: null,
  ai: { used: 0, limit: 5, period: '2026-10' },
};

/** Reached, but stood in for: the brief lists these so their errors are not filed as findings. */
export const STUBBED = ['POST /published', 'POST /published/:id/comments', 'POST /reports', 'POST /ai-substitutions'];

const ok = (body: unknown): Answer => ({ status: 200, body });
const no = (status: number, error: string): Answer => ({ status, body: { error } });
const signedOut = no(401, 'Not signed in');
const stub = no(503, 'Not available in a UI review run.');

export function answer(method: string, url: URL, authorized: boolean, server: ReviewServer): Answer | null {
  const parts = url.pathname.replace(/^.*?\/api/, '').split('/').filter(Boolean);
  const [head, id, sub] = parts;
  const get = method === 'GET';

  if (head === 'health' && get) return ok({ status: 'ok', database: 'connected' });

  if (head === 'published') {
    if (!id && get) {
      const all = url.searchParams.get('featured') ? server.shared.filter((p) => p.featured) : server.shared;
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? all.length);
      return ok({ items: all.slice(offset, offset + limit), total: all.length, offset, limit });
    }
    if (!id && method === 'POST') return authorized ? stub : signedOut;
    if (id === 'index' && get) return ok({ items: server.shared });
    if (id === 'mine' && get) return authorized ? ok({ items: [] }) : signedOut;
    if (sub === 'comments' && get) return ok({ items: [] });
    if (sub === 'comments' && method === 'POST') return authorized ? stub : signedOut;
    if (sub === 'rating' && get) return authorized ? ok({ stars: null, baked: false }) : signedOut;
    if (sub === 'save' && method === 'POST') return ok({ ok: true });
    if (id && !sub && get) {
      const recipe = server.shared.find((p) => p.slug === id || p._id === id);
      return recipe ? ok(recipe) : no(404, 'Not in the shared cookbook.');
    }
  }

  if (head === 'profiles' && id && get) {
    return ok({
      profile: { handle: id, displayName: 'Proof Kitchen', bio: 'The house cookbook.', pro: false, joinedAt: '2026-08-01T00:00:00.000Z' },
      recipes: server.shared.slice(0, 12),
      stats: { published: 12, baked: 40 },
    });
  }

  if (head === 'auth') {
    if ((id === 'signup' || id === 'login') && method === 'POST') {
      return ok({ token: REVIEW_TOKEN, user: REVIEW_ACCOUNT, verificationSent: id === 'signup' });
    }
    if (id === 'me' && get) return authorized ? ok(REVIEW_ACCOUNT) : signedOut;
    if (id === 'logout' && method === 'POST') return ok({ ok: true });
  }

  if ((head === 'extract' || head === 'ai-restructure') && method === 'POST') return ok(server.extracted);
  if ((head === 'reports' || head === 'ai-substitutions') && method === 'POST') return stub;

  return null;
}
