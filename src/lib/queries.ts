/**
 * TanStack Query hooks for server state.
 *
 * These replace raw useState/useEffect fetch patterns throughout the app.
 * Each hook automatically caches, dedupes, and refetches in the background.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Recipe, type BakeLog } from './api';
import { getLocalBakeLogs } from './localDB';

// ── Query Keys ─────────────────────────────────────────────────────────────
export const queryKeys = {
  recipes: (search?: string) => ['recipes', search ?? ''] as const,
  recipe: (id: string) => ['recipe', id] as const,
  bakeLogs: () => ['bakeLogs'] as const,
  recipeBakeLogs: (recipeId: string) => ['bakeLogs', 'recipe', recipeId] as const,
  pantry: () => ['pantry'] as const,
  notes: () => ['notes'] as const,
};

// ── Recipes ────────────────────────────────────────────────────────────────
export const useRecipes = (search?: string) =>
  useQuery({
    queryKey: queryKeys.recipes(search),
    queryFn: () => api.getRecipes(search),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

export const useRecipe = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.recipe(id!),
    queryFn: () => api.getRecipe(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

export const useUpdateRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<Recipe, '_id'> }) =>
      api.updateRecipe(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.recipe(updated._id!), updated);
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

// ── Bake Logs ──────────────────────────────────────────────────────────────
export const useBakeLogs = () =>
  useQuery({
    queryKey: queryKeys.bakeLogs(),
    queryFn: () => api.getBakeLogs(),
    staleTime: 1000 * 60 * 5,
  });

export const useRecipeBakeLogs = (recipeId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.recipeBakeLogs(recipeId!),
    queryFn: async () => {
      const [cloudLogs, localLogs] = await Promise.all([
        api.getRecipeBakeLogs(recipeId!).catch(() => [] as BakeLog[]),
        getLocalBakeLogs(recipeId!)
      ]);
      return [...cloudLogs, ...localLogs].sort(
        (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      );
    },
    enabled: !!recipeId,
    staleTime: 1000 * 60 * 5,
  });

// ── Pantry ─────────────────────────────────────────────────────────────────
export const usePantry = () =>
  useQuery({
    queryKey: queryKeys.pantry(),
    queryFn: () => api.getPantry(),
    staleTime: 1000 * 60 * 10,
  });

// ── Notes ──────────────────────────────────────────────────────────────────
export const useNotes = () =>
  useQuery({
    queryKey: queryKeys.notes(),
    queryFn: () => api.getNotes(),
    staleTime: 1000 * 60 * 5,
  });
