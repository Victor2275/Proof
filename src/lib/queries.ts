/*
 * TanStack Query hooks.
 *
 * Two kinds of data, with different rules:
 *
 * - The cookbook (recipes, bakes, pantry, notes, folders) is local. It is read
 *   from the device's repository, never goes stale behind the app's back, and
 *   is refreshed by invalidation after each write. `networkMode: 'always'`
 *   matters: TanStack pauses queries while the browser reports itself offline,
 *   which would leave a local read waiting forever for a network it never uses.
 *
 * - The shared cookbook is remote. It is cached briefly and fails with a
 *   message that says the cookbook itself is unaffected.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import { repo, type NewBakePhoto } from './repo';
import type { BakeLog, Draft, PublishedRecipe, Recipe } from './types';

export const queryKeys = {
  recipes: () => ['recipes'] as const,
  recipe: (id: string) => ['recipe', id] as const,
  bakeLogs: () => ['bakeLogs'] as const,
  recipeBakeLogs: (recipeId: string) => ['bakeLogs', 'recipe', recipeId] as const,
  pantry: () => ['pantry'] as const,
  notes: () => ['notes'] as const,
  folders: () => ['folders'] as const,
  published: (featured: boolean) => ['published', featured ? 'featured' : 'all'] as const,
  publishedRecipe: (key: string) => ['published', 'recipe', key] as const,
};

const LOCAL = { staleTime: Infinity, networkMode: 'always' as const, retry: false };

/** Once, and only for a failure that might pass: no network, or a server error. A 404 is an answer. */
const retryRemote = (failures: number, error: unknown) =>
  failures < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500);

const REMOTE = { staleTime: 1000 * 60 * 5, networkMode: 'always' as const, retry: retryRemote };

/** After a write: everything that reads the cookbook reads it again. Local reads are cheap. */
const refreshCookbook = (client: QueryClient) => {
  void client.invalidateQueries({ queryKey: ['recipes'] });
  void client.invalidateQueries({ queryKey: ['recipe'] });
  void client.invalidateQueries({ queryKey: ['bakeLogs'] });
  void client.invalidateQueries({ queryKey: ['folders'] });
};

/* ── Recipes ────────────────────────────────────────────────────────────── */

export const useRecipes = () => useQuery({ queryKey: queryKeys.recipes(), queryFn: repo.getRecipes, ...LOCAL });

export const useRecipe = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.recipe(id ?? ''), queryFn: () => repo.getRecipe(id!), enabled: !!id, ...LOCAL });

export const useCreateRecipe = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: Draft<Recipe>) => repo.createRecipe(draft),
    networkMode: 'always',
    onSuccess: () => refreshCookbook(client),
  });
};

export const useUpdateRecipe = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Draft<Recipe>> }) => repo.updateRecipe(id, data),
    networkMode: 'always',
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.recipe(updated._id), updated);
      refreshCookbook(client);
    },
  });
};

export const useDeleteRecipe = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteRecipe(id),
    networkMode: 'always',
    onSuccess: () => refreshCookbook(client),
  });
};

/**
 * Saves a recipe from the shared cookbook into this one. A summary (from a
 * list) carries no method, so the whole recipe is fetched first.
 */
export const useForkPublished = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (published: PublishedRecipe) =>
      repo.forkPublished(published.instructions ? published : await api.getPublishedRecipe(published.slug)),
    networkMode: 'always',
    onSuccess: () => refreshCookbook(client),
  });
};

/* ── Bake logs ──────────────────────────────────────────────────────────── */

export const useBakeLogs = () => useQuery({ queryKey: queryKeys.bakeLogs(), queryFn: repo.getBakeLogs, ...LOCAL });

export const useRecipeBakeLogs = (recipeId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.recipeBakeLogs(recipeId ?? ''),
    queryFn: () => repo.getRecipeBakeLogs(recipeId!),
    enabled: !!recipeId,
    ...LOCAL,
  });

export const useCreateBakeLog = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ draft, photos }: { draft: { recipeId: string; notes: string }; photos: NewBakePhoto[] }) =>
      repo.createBakeLog(draft, photos),
    networkMode: 'always',
    onSuccess: () => refreshCookbook(client),
  });
};

export const useUpdateBakeLog = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Draft<BakeLog>> }) => repo.updateBakeLog(id, patch),
    networkMode: 'always',
    onSuccess: () => refreshCookbook(client),
  });
};

export const useDeleteBakeLog = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteBakeLog(id),
    networkMode: 'always',
    onSuccess: () => refreshCookbook(client),
  });
};

/* ── Pantry ─────────────────────────────────────────────────────────────── */

export const usePantry = () => useQuery({ queryKey: queryKeys.pantry(), queryFn: repo.getPantry, ...LOCAL });

export const useAddPantryItem = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => repo.addPantryItem({ name }),
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.pantry() }),
  });
};

export const useDeletePantryItem = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deletePantryItem(id),
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.pantry() }),
  });
};

/* ── Notes ──────────────────────────────────────────────────────────────── */

export const useNotes = () => useQuery({ queryKey: queryKeys.notes(), queryFn: repo.getNotes, ...LOCAL });

/* ── Folders ────────────────────────────────────────────────────────────── */

export const useFolders = () => useQuery({ queryKey: queryKeys.folders(), queryFn: repo.getFolders, ...LOCAL });

/* ── The shared cookbook ────────────────────────────────────────────────── */

export const useFeaturedRecipes = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.published(true),
    queryFn: async () => (await api.getPublished({ featured: true, limit: 8 })).items,
    enabled,
    ...REMOTE,
  });

export const usePublishedRecipe = (key: string | undefined) =>
  useQuery({
    queryKey: queryKeys.publishedRecipe(key ?? ''),
    queryFn: () => api.getPublishedRecipe(key!),
    enabled: !!key,
    ...REMOTE,
  });
