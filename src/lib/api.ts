/*
 * The server, for what is genuinely remote.
 *
 * The cookbook itself is not here: it lives on the device and is read and
 * written through src/lib/repo. What remains is what only a server can do —
 * the shared cookbook, accounts, the AI, the live kitchen timers, and the
 * operator's tools — and every caller of it has to be ready for the network
 * not to be there, because now that is the normal case rather than an outage.
 */
import type { PublishedRecipe, Recipe } from './types';
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
 *   either    the operator's if held, else the account's (the AI, which both may use)
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

export interface SignedIn {
  token: string;
  user: Account;
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

  deleteAccount: (password: string) =>
    request<{ ok: true }>('/auth/me', { method: 'DELETE', body: { password }, auth: 'user' }),

  /* ── AI ──────────────────────────────────────────────────────────────── */

  extractRecipe: (url: string) => request<Partial<Recipe>>('/extract', { method: 'POST', body: { url }, auth: 'either' }),

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
};
