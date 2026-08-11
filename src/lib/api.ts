export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getHeaders = (isFormData = false) => {
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('adminToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth-required'));
    throw new Error('Admin authentication required.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
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
}

export interface PantryItem {
  _id?: string;
  name: string;
  createdAt?: string;
}

export const api = {
  getRecipes: async (search?: string) => {
    try {
      const url = search ? `${API_URL}/recipes?search=${encodeURIComponent(search)}` : `${API_URL}/recipes`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await handleResponse(res);
      if (!search && Array.isArray(data)) {
        localStorage.setItem('cached_recipes', JSON.stringify(data));
      }
      return data;
    } catch (err) {
      console.warn('Backend server unreachable, trying offline local cache:', err);
      const cached = localStorage.getItem('cached_recipes');
      if (cached) {
        try { return JSON.parse(cached); } catch {}
      }
      return [];
    }
  },
  
  getAllBakeLogs: async () => {
    try {
      const res = await fetch(`${API_URL}/bakelogs`, { headers: getHeaders() });
      const data = await handleResponse(res);
      localStorage.setItem('cached_bakelogs', JSON.stringify(data));
      return data;
    } catch (err) {
      console.warn('Backend server unreachable, trying offline local cache:', err);
      const cached = localStorage.getItem('cached_bakelogs');
      if (cached) {
        try { return JSON.parse(cached); } catch {}
      }
      return [];
    }
  },

  // Pantry
  getPantry: async (): Promise<PantryItem[]> => {
    try {
      const res = await fetch(`${API_URL}/pantry`, { headers: getHeaders() });
      const data = await handleResponse(res);
      localStorage.setItem('cached_pantry', JSON.stringify(data));
      return data;
    } catch (err) {
      console.warn('Backend server unreachable, trying offline local cache:', err);
      const cached = localStorage.getItem('cached_pantry');
      if (cached) {
        try { return JSON.parse(cached); } catch {}
      }
      return [];
    }
  },
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
