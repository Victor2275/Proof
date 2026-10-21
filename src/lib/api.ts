/*
 * The server, for what is genuinely remote.
 *
 * The cookbook itself is not here: it lives on the device and is read and
 * written through src/lib/repo. What remains is what only a server can do —
 * the shared cookbook, the AI, the live kitchen timers, and the operator's
 * tools — and every caller of it has to be ready for the network not to be
 * there, because now that is the normal case rather than an outage.
 */
import type { PublishedRecipe, Recipe } from './types';
import { operatorToken } from './session';

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

/** Carries the HTTP status so callers can tell "server said no" from "server unreachable". */
export class ApiError extends Error {
  status: number;
  degraded: boolean;
  constructor(message: string, status: number, degraded = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.degraded = degraded;
  }
}

/** The network itself failed: offline, or the server is asleep or gone. */
export const OFFLINE_MESSAGE = "Can't reach the server. Your cookbook is unaffected; try again when you're online.";

const operatorHeaders = (json = true) => {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = operatorToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth-required'));
    throw new ApiError('That needs the operator PIN.', 401);
  }
  // A degraded server answers 503 with a JSON body; a crashed one may not answer
  // with JSON at all, so don't let the parse throw over the real status.
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `The server answered ${res.status}.`, res.status, !!data.degraded);
  return data as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', headers: operatorHeaders(), body: JSON.stringify(body) });

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

  /* ── AI ──────────────────────────────────────────────────────────────── */

  extractRecipe: (url: string) => post<Partial<Recipe>>('/extract', { url }),

  restructureRecipe: (rawText: string) => post<Partial<Recipe>>('/ai-restructure', { rawText }),

  getAISubstitutions: (ingredientName: string, recipeTitle?: string) =>
    post<{ substitutions: { substitute: string; ratio: string; notes: string }[] }>('/ai-substitutions', {
      ingredientName,
      recipeTitle,
    }),

  /* ── Operator ────────────────────────────────────────────────────────── */

  submitPin: (pin: string) =>
    request<{ token: string }>('/auth/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }),

  rehostImages: () =>
    request<{ recipesUpdated: number; bakeLogsUpdated: number; rehostedCount: number }>('/maintenance/rehost-images', {
      method: 'POST',
      headers: operatorHeaders(),
    }),

  /** The server's whole database as one JSON file. */
  downloadServerBackup: async (): Promise<Blob> => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/backup`, { headers: operatorHeaders(false) });
    } catch {
      throw new ApiError(OFFLINE_MESSAGE, 0);
    }
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth-required'));
      throw new ApiError('That needs the operator PIN.', 401);
    }
    if (!res.ok) throw new ApiError(`The server answered ${res.status}.`, res.status);
    return res.blob();
  },

  /** The operator's pre-Phase-1 library, to bring onto this device. */
  getServerLibrary: async (): Promise<ServerLibrary> => {
    const get = (path: string) => request<unknown[]>(path, { headers: operatorHeaders(false) });
    const [recipes, bakeLogs, notes, pantry] = await Promise.all([
      get('/recipes'),
      get('/bakelogs'),
      get('/notes'),
      get('/pantry'),
    ]);
    return { recipes, bakeLogs, notes, pantry };
  },
};

