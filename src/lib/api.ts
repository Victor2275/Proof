export const API_URL = 'http://localhost:3001/api';

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
  parentRecipeId?: string | null;
  versionNumber?: number;
  isLatestVersion?: boolean;
  commitMessage?: string;
}

export interface BakeLog {
  _id?: string;
  recipeId: string | { _id: string, title: string };
  date: string;
  temperature: string;
  humidity: string;
  notes: string;
  imageUrls: string[];
}

export const api = {
  getRecipes: async (search?: string): Promise<Recipe[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_URL}/recipes${query}`);
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
  }
};
