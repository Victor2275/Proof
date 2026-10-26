/*
 * The server, for what is genuinely remote.
 *
 * The cookbook itself is not here: it lives on the device and is read and
 * written through src/lib/repo. What remains is what only a server can do —
 * the shared cookbook, accounts, the AI, the live kitchen timers, and the
 * operator's tools — and every caller of it has to be ready for the network
 * not to be there, because now that is the normal case rather than an outage.
 */
import type { Profile, Publication, PublishedComment, PublishedRecipe, PublishedStats, Recipe } from './types';
import { operatorToken, setAccount, userToken, type Account } from './session';

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

/** Carries the HTTP status so callers can tell "server said no" from "server unreachable". */
export class ApiError extends Error {
  status: number;
  degraded: boolean;
  /** The form field the server objected to, when it named one. */
  field?: string;
  constructor(message: string, status: number, degraded = false, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.degraded = degraded;
    this.field = field;
  }
}

/** The network itself failed: offline, or the server is asleep or gone. */
export const OFFLINE_MESSAGE = "Can't reach the server. Your cookbook is unaffected; try again when you're online.";

/*
 * Which session a request carries:
 *
 *   operator  the operator PIN's session; a 401 asks for the PIN again
 *   user      the signed-in account; a 401 means it ended elsewhere, so the
 *             device signs out and asks the person to sign in again
 *   either    the operator's if held, else the account's (the AI and moderation, which both may use)
 *   none      nothing
 */
type Auth = 'operator' | 'user' | 'either' | 'none';

function tokenFor(auth: Auth): { token: string | null; as: 'operator' | 'user' | null } {
  const op = operatorToken();
  const user = userToken();
  if (auth === 'operator' || (auth === 'either' && op)) return { token: op, as: 'operator' };
  if (auth === 'user' || auth === 'either') return { token: user, as: 'user' };
  return { token: null, as: null };
}

interface Options {
  method?: string;
  body?: unknown;
  auth?: Auth;
}

async function call(path: string, { method = 'GET', body, auth = 'none' }: Options): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const { token, as } = tokenFor(auth);
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }
  if (res.status === 401 && as === 'operator') {
    window.dispatchEvent(new Event('auth-required'));
  } else if (res.status === 401 && as === 'user' && token) {
    // The session ended on the server: a password change elsewhere, a deleted
    // account, or it simply expired. This device stops pretending otherwise.
    setAccount(null);
    window.dispatchEvent(new Event('account-required'));
  }
  return res;
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const res = await call(path, options);
  // A degraded server answers 503 with a JSON body; a crashed one may not answer
  // with JSON at all, so don't let the parse throw over the real status.
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `The server answered ${res.status}.`, res.status, !!data.degraded, data.field);
  return data as T;
}

async function download(path: string, auth: Auth): Promise<Blob> {
  const res = await call(path, { auth });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || `The server answered ${res.status}.`, res.status);
  }
  return res.blob();
}

export interface PublishedPage {
  items: PublishedRecipe[];
  total: number;
  offset: number;
  limit: number;
}

/** What the server's legacy library endpoints hold: the operator's records from before Phase 1. */
export interface ServerLibrary {
  recipes: unknown[];
  bakeLogs: unknown[];
  notes: unknown[];
  pantry: unknown[];
}

/** What publishing sends: the recipe as it stands on the device, photographs as data or URLs. */
export interface PublishBody {
  sourceLocalId: string;
  sourceUpdatedAt: string;
  title: string;
  description: string;
  servings: number;
  difficulty?: string;
  prepTime: string;
  cookTime: string;
  tags: string[];
  folder?: string;
  ingredients: Recipe['ingredients'];
  instructions: string[];
  photos: string[];
  sourceUrl?: string;
  sourceAttribution?: string;
  ownWords?: boolean;
  forkedFrom?: { publishedId: string; authorHandle: string; title: string } | null;
}

export interface ModerationQueue {
  recipes: (Publication & { ownWords?: boolean })[];
  comments: { _id: string; publishedId: string; authorHandle: string; body: string; moderation: { reason: string }; createdAt: string }[];
  reports: {
    _id: string;
    targetType: 'recipe' | 'comment';
    targetId: string;
    reason: string;
    createdAt: string;
    target: { title?: string; slug?: string; body?: string; authorHandle?: string; publishedId?: string } | null;
  }[];
}

/** An account as a moderator sees it (server/services/accounts.ts staffUser). */
export interface StaffAccount {
  id: string;
  handle: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  moderator: boolean;
  pro: boolean;
  plan: 'free' | 'pro';
  joinedAt: string;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string;
}

export type AccountFilter = 'all' | 'unconfirmed' | 'moderators' | 'suspended';

export interface AccountPage {
  items: StaffAccount[];
  total: number;
  offset: number;
  limit: number;
}

/** One line of the moderation log. */
export interface LogEntry {
  _id: string;
  actorKind: 'operator' | 'moderator';
  actorHandle: string;
  action: string;
  targetType: 'account' | 'recipe' | 'comment' | 'report';
  targetId: string;
  label: string;
  reason: string;
  createdAt: string;
}

export interface AccountDetail {
  account: StaffAccount;
  /** Devices signed in now. */
  sessions: number;
  published: {
    _id: string;
    slug: string;
    title: string;
    moderation: { state: 'approved' | 'pending' | 'rejected'; reason: string };
    unpublishedAt: string | null;
    hiddenAt: string | null;
    publishedAt: string;
  }[];
  comments: {
    _id: string;
    body: string;
    moderation: { state: 'approved' | 'pending' | 'removed' };
    deletedAt: string | null;
    createdAt: string;
    recipe: { title: string; slug: string } | null;
  }[];
  reports: { _id: string; targetType: 'recipe' | 'comment'; reason: string; resolvedAt: string | null; resolution: string; createdAt: string }[];
  log: LogEntry[];
}

export interface SignedIn {
  token: string;
  user: Account;
  /** On sign-up: whether the confirmation email went out. */
  verificationSent?: boolean;
}

export const api = {
  /** Whether the server answers at all. The cookbook doesn't need it to. */
  health: () => request<{ status: string; database: string }>('/health'),

  /* ── The shared cookbook ─────────────────────────────────────────────── */

  getPublished: (opts: { featured?: boolean; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.featured) q.set('featured', '1');
    if (opts.limit) q.set('limit', String(opts.limit));
    if (opts.offset) q.set('offset', String(opts.offset));
    const query = q.toString();
    return request<PublishedPage>(`/published${query ? `?${query}` : ''}`);
  },

  getPublishedRecipe: (idOrSlug: string) =>
    request<PublishedRecipe>(`/published/${encodeURIComponent(idOrSlug)}`),

  /** Every live recipe in brief: Discover searches it on the device. */
  getPublishedIndex: () => request<{ items: PublishedRecipe[] }>('/published/index'),

  getMyPublications: () => request<{ items: Publication[] }>('/published/mine', { auth: 'user' }),

  publishRecipe: (body: PublishBody) =>
    request<{ recipe: Publication; droppedPhotos: number }>('/published', { method: 'POST', body, auth: 'user' }),

  unpublishRecipe: (id: string) =>
    request<{ recipe: Publication }>(`/published/${encodeURIComponent(id)}`, { method: 'DELETE', auth: 'user' }),

  /** Counts a save into someone's cookbook. Best-effort: a save works offline without it. */
  countSave: (id: string) => request<{ ok: true }>(`/published/${encodeURIComponent(id)}/save`, { method: 'POST' }),

  getMyRating: (id: string) =>
    request<{ stars: number | null; baked: boolean }>(`/published/${encodeURIComponent(id)}/rating`, { auth: 'user' }),

  rateRecipe: (id: string, body: { stars?: number | null; baked?: boolean }) =>
    request<{ rating: { stars: number | null; baked: boolean }; stats: PublishedStats }>(
      `/published/${encodeURIComponent(id)}/rating`,
      { method: 'PUT', body, auth: 'user' },
    ),

  getComments: (id: string) =>
    request<{ items: PublishedComment[] }>(`/published/${encodeURIComponent(id)}/comments`, { auth: 'user' }),

  postComment: (id: string, body: string) =>
    request<{ comment: PublishedComment }>(`/published/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: { body },
      auth: 'user',
    }),

  deleteComment: (id: string) =>
    request<{ ok: true }>(`/published/comments/${encodeURIComponent(id)}`, { method: 'DELETE', auth: 'user' }),

  report: (body: { targetType: 'recipe' | 'comment'; targetId: string; reason: string }) =>
    request<{ ok: true }>('/reports', { method: 'POST', body, auth: 'user' }),

  getProfile: (handle: string) => request<Profile>(`/profiles/${encodeURIComponent(handle)}`),

  /* ── Accounts ────────────────────────────────────────────────────────── */

  signUp: (body: { email: string; password: string; handle: string; displayName?: string }) =>
    request<SignedIn>('/auth/signup', { method: 'POST', body }),

  signIn: (body: { email: string; password: string }) => request<SignedIn>('/auth/login', { method: 'POST', body }),

  signOut: () => request<{ ok: true }>('/auth/logout', { method: 'POST', auth: 'user' }),

  me: () => request<Account>('/auth/me', { auth: 'user' }),

  updateMe: (body: { displayName?: string; bio?: string; handle?: string }) =>
    request<Account>('/auth/me', { method: 'PATCH', body, auth: 'user' }),

  changePassword: (body: { current: string; next: string }) =>
    request<{ token: string }>('/auth/password', { method: 'POST', body, auth: 'user' }),

  exportAccount: () => download('/auth/export', 'user'),

  verifyEmail: (token: string) => request<{ user: Account }>('/auth/verify', { method: 'POST', body: { token } }),

  resendVerification: () => request<{ sent: boolean }>('/auth/verify/resend', { method: 'POST', auth: 'user' }),

  forgotPassword: (email: string) => request<{ ok: true }>('/auth/password/forgot', { method: 'POST', body: { email } }),

  resetPassword: (token: string, password: string) =>
    request<{ ok: true }>('/auth/password/reset', { method: 'POST', body: { token, password } }),

  deleteAccount: (password: string) =>
    request<{ ok: true }>('/auth/me', { method: 'DELETE', body: { password }, auth: 'user' }),

  /* ── AI ──────────────────────────────────────────────────────────────── */

  extractRecipe: (url: string) => request<Partial<Recipe>>('/extract', { method: 'POST', body: { url }, auth: 'either' }),

  /** A photographed page of a recipe, as a data URL, read into a recipe. */
  readRecipePhoto: (image: string) =>
    request<Partial<Recipe>>('/ai-photo', { method: 'POST', body: { image }, auth: 'either' }),

  restructureRecipe: (rawText: string) =>
    request<Partial<Recipe>>('/ai-restructure', { method: 'POST', body: { rawText }, auth: 'either' }),

  getAISubstitutions: (ingredientName: string, recipeTitle?: string) =>
    request<{ substitutions: { substitute: string; ratio: string; notes: string }[] }>('/ai-substitutions', {
      method: 'POST',
      body: { ingredientName, recipeTitle },
      auth: 'either',
    }),

  /* ── Operator ────────────────────────────────────────────────────────── */

  submitPin: (pin: string) => request<{ token: string }>('/auth/pin', { method: 'POST', body: { pin } }),

  rehostImages: () =>
    request<{ recipesUpdated: number; bakeLogsUpdated: number; rehostedCount: number }>('/maintenance/rehost-images', {
      method: 'POST',
      auth: 'operator',
    }),

  /** The server's whole database as one JSON file. */
  downloadServerBackup: () => download('/backup', 'operator'),

  /** The operator's pre-Phase-1 library, to bring onto this device. */
  getServerLibrary: () => request<ServerLibrary>('/library', { auth: 'operator' }),

  /* ── Moderation: the operator, or a moderator account ────────────────── */

  getModerationQueue: () => request<ModerationQueue>('/moderation/queue', { auth: 'either' }),

  moderateRecipe: (id: string, action: 'approve' | 'reject' | 'takedown', reason = '') =>
    request<{ ok: true }>(`/moderation/recipes/${encodeURIComponent(id)}`, { method: 'POST', body: { action, reason }, auth: 'either' }),

  moderateComment: (id: string, action: 'approve' | 'remove', reason = '') =>
    request<{ ok: true }>(`/moderation/comments/${encodeURIComponent(id)}`, { method: 'POST', body: { action, reason }, auth: 'either' }),

  resolveReport: (id: string, resolution: string) =>
    request<{ ok: true }>(`/moderation/reports/${encodeURIComponent(id)}`, { method: 'POST', body: { resolution }, auth: 'either' }),

  getModerationLog: (offset = 0) =>
    request<{ items: LogEntry[]; total: number }>(`/moderation/log?offset=${offset}`, { auth: 'either' }),

  listAccounts: (filter: AccountFilter, q = '', offset = 0) =>
    request<AccountPage>(`/accounts?${new URLSearchParams({ filter, q, offset: String(offset) })}`, { auth: 'either' }),

  getAccount: (id: string) => request<AccountDetail>(`/accounts/${encodeURIComponent(id)}`, { auth: 'either' }),

  confirmAccount: (id: string) =>
    request<{ account: StaffAccount }>(`/accounts/${encodeURIComponent(id)}/confirm`, { method: 'POST', auth: 'either' }),

  setAccountRole: (id: string, role: 'moderator' | 'user') =>
    request<{ account: StaffAccount }>(`/accounts/${encodeURIComponent(id)}/role`, { method: 'POST', body: { role }, auth: 'either' }),

  suspendAccount: (id: string, reason: string) =>
    request<{ account: StaffAccount }>(`/accounts/${encodeURIComponent(id)}/suspend`, { method: 'POST', body: { reason }, auth: 'either' }),

  unsuspendAccount: (id: string) =>
    request<{ account: StaffAccount }>(`/accounts/${encodeURIComponent(id)}/unsuspend`, { method: 'POST', auth: 'either' }),

  signOutAccount: (id: string) =>
    request<{ ok: true }>(`/accounts/${encodeURIComponent(id)}/signout`, { method: 'POST', auth: 'either' }),
};
