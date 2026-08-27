export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

const getHeaders = (isFormData = false) => {
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('adminToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

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

/**
 * Announce that the screen is showing a locally cached copy rather than live data,
 * so the UI can say so instead of quietly presenting stale content as current.
 */
const announceStale = (reason: string) => {
  window.dispatchEvent(new CustomEvent('api-stale', { detail: { reason } }));
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth-required'));
    throw new ApiError('Admin authentication required.', 401);
  }
  // A degraded server answers 503 with a JSON body; a crashed one may not answer
  // with JSON at all, so don't let the parse throw over the real status.
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, !!data.degraded);
  return data;
};

/**
 * Reads that can fall back to a local cache.
 *
 * Falling back is right when the network is gone — you should still be able to read
 * a recipe in the kitchen. Falling back *silently* is not: every caller used to
 * swallow the error and return [], so a 500 or an unreachable database rendered as
 * an empty cookbook with no way to tell an outage from genuinely having no recipes.
 * Now a cache hit is announced as stale, and a miss propagates so the screen can
 * show an error with a retry.
 */
const cachedRead = async <T>(cacheKey: string, fetcher: () => Promise<T>, label: string): Promise<T> => {
  try {
    const data = await fetcher();
    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  } catch (err) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as T;
        console.warn(`${label}: serving cached copy —`, err);
        announceStale(err instanceof ApiError && err.degraded
          ? 'The server is up but its database is unavailable.'
          : "Can't reach the server.");
        return parsed;
      } catch { /* corrupt cache falls through to the throw below */ }
    }
    throw err;
  }
};

export interface Note {
  _id?: string;
  title: string;
  content: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface Component {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  _id?: string;
  title: string;
  description: string;
  imageUrls: string[];
  servings: number;
  difficulty?: string;
  prepTime: string;
  cookTime: string;
  tags: string[];
  ingredients: Component[];
  instructions: string[];
  instructionLinks?: { stepIndex: number; recipeId: string; recipeTitle: string }[];
  labNotes?: string;
  folder?: string;
  parentRecipeId?: string | null;
  versionNumber?: number;
  isLatestVersion?: boolean;
  commitMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BakeLog {
  _id?: string;
  recipeId: string | { _id: string, title: string };
  date: string;
  isPersonalBest?: boolean;
  notes: string;
  imageUrls: string[];
  images?: { url: string; label: string }[];
}

export interface PantryItem {
  _id?: string;
  name: string;
  createdAt?: string;
}

export const api = {
  getRecipes: async (search?: string) => {
    const fetcher = async () => {
      const url = search ? `${API_URL}/recipes?search=${encodeURIComponent(search)}` : `${API_URL}/recipes`;
      return handleResponse(await fetch(url, { headers: getHeaders() }));
    };
    // Only the unfiltered list is worth caching — a search result isn't the cookbook.
    if (search) return fetcher();
    return cachedRead('cached_recipes', fetcher, 'Recipes');
  },

  getAllBakeLogs: async () => cachedRead(
    'cached_bakelogs',
    async () => handleResponse(await fetch(`${API_URL}/bakelogs`, { headers: getHeaders() })),
    'Bake logs',
  ),

  // Pantry
  getPantry: async (): Promise<PantryItem[]> => cachedRead(
    'cached_pantry',
    async () => handleResponse(await fetch(`${API_URL}/pantry`, { headers: getHeaders() })),
    'Pantry',
  ),
  addPantryItem: async (item: Partial<PantryItem>): Promise<PantryItem> => {
    const res = await fetch(`${API_URL}/pantry`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    return handleResponse(res);
  },
  deletePantryItem: async (id: string) => {
    const res = await fetch(`${API_URL}/pantry/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getRecipe: async (id: string): Promise<Recipe> => {
    const res = await fetch(`${API_URL}/recipes/${id}`);
    return handleResponse(res);
  },
  createRecipe: async (recipe: Omit<Recipe, '_id'>): Promise<Recipe> => {
    const res = await fetch(`${API_URL}/recipes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(recipe),
    });
    return handleResponse(res);
  },

  updateRecipe: async (id: string, recipe: Partial<Recipe>): Promise<Recipe> => {
    const res = await fetch(`${API_URL}/recipes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(recipe),
    });
    return handleResponse(res);
  },

  createRecipeVersion: async (id: string, recipe: Omit<Recipe, '_id'>): Promise<Recipe> => {
    const res = await fetch(`${API_URL}/recipes/${id}/version`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(recipe),
    });
    return handleResponse(res);
  },

  getRecipeVersions: async (id: string): Promise<Recipe[]> => {
    const res = await fetch(`${API_URL}/recipes/${id}/versions`);
    return handleResponse(res);
  },

  uploadImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  analyzeImage: async (imageUrl: string): Promise<{ tags: string[] }> => {
    const res = await fetch(`${API_URL}/analyze-image`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ imageUrl }),
    });
    return handleResponse(res);
  },

  extractRecipe: async (url: string): Promise<Partial<Recipe>> => {
    const res = await fetch(`${API_URL}/extract`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url }),
    });
    return handleResponse(res);
  },

  deleteRecipe: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/recipes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete recipe');
    return res.json();
  },

  getNotes: async (): Promise<Note[]> => {
    const res = await fetch(`${API_URL}/notes`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  createNote: async (note: Omit<Note, '_id'>): Promise<Note> => {
    const res = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  },

  updateNote: async (id: string, note: Partial<Note>): Promise<Note> => {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },

  deleteNote: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete note');
    return res.json();
  },

  getBakeLogs: async (): Promise<BakeLog[]> => {
    const res = await fetch(`${API_URL}/bakelogs`);
    if (!res.ok) throw new Error('Failed to fetch bakelogs');
    return res.json();
  },

  getRecipeBakeLogs: async (recipeId: string): Promise<BakeLog[]> => {
    const res = await fetch(`${API_URL}/recipes/${recipeId}/bakelogs`);
    if (!res.ok) throw new Error('Failed to fetch recipe bakelogs');
    return res.json();
  },

  updateBakeLog: async (id: string, updates: Partial<BakeLog>): Promise<BakeLog> => {
    const res = await fetch(`${API_URL}/bakelogs/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update bake log');
    return res.json();
  },

  deleteBakeLog: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/bakelogs/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  restructureRecipe: async (rawText: string): Promise<Partial<Recipe>> => {
    const res = await fetch(`${API_URL}/ai-restructure`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rawText }),
    });
    return handleResponse(res);
  },

  submitPin: async (pin: string): Promise<{ token: string }> => {
    const res = await fetch(`${API_URL}/auth/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return handleResponse(res);
  },

  syncTimer: async (timer: any) => {
    const res = await fetch(`${API_URL}/timers/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timer })
    });
    return handleResponse(res);
  },

  getActiveTimer: async () => {
    const res = await fetch(`${API_URL}/timers/active`);
    return handleResponse(res);
  },

  getAISubstitutions: async (ingredientName: string, recipeTitle?: string): Promise<{ substitutions: { substitute: string, ratio: string, notes: string }[] }> => {
    const res = await fetch(`${API_URL}/ai-substitutions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ingredientName, recipeTitle })
    });
    return handleResponse(res);
  }
};
