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
import { api, ApiError, type PublishBody } from './api';
import { repo, type NewBakePhoto } from './repo';
import type { BakeLog, Draft, Publication, PublishedRecipe, Recipe } from './types';
import { useSession } from './session';

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
  publishedIndex: () => ['published', 'index'] as const,
  publications: (accountId: string) => ['published', 'mine', accountId] as const,
  rating: (id: string, accountId: string) => ['published', 'rating', id, accountId] as const,
  comments: (id: string) => ['published', 'comments', id] as const,
  profile: (handle: string) => ['profile', handle] as const,
  moderation: () => ['moderation'] as const,
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
    onSuccess: (_saved, published) => {
      refreshCookbook(client);
      // The fork count is a courtesy to the author; the copy is saved either way.
      void api.countSave(published._id).catch(() => undefined);
    },
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

export const usePublishedIndex = () =>
  useQuery({
    queryKey: queryKeys.publishedIndex(),
    queryFn: async () => (await api.getPublishedIndex()).items,
    ...REMOTE,
  });

/* ── Publishing ─────────────────────────────────────────────────────────── */

/**
 * The signed-in author's published copies, keyed by the id of the recipe on
 * this device — which is how a recipe knows it is LOCAL, LIVE or LIVE + EDITS.
 */
export function usePublications() {
  const { session } = useSession();
  const accountId = session.user?.id ?? '';
  const query = useQuery({
    queryKey: queryKeys.publications(accountId),
    queryFn: async () => (await api.getMyPublications()).items,
    enabled: !!accountId,
    ...REMOTE,
  });
  const byLocalId = new Map<string, Publication>();
  for (const p of query.data ?? []) if (!p.unpublishedAt) byLocalId.set(p.sourceLocalId, p);
  return { ...query, byLocalId };
}

export const usePublishRecipe = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: PublishBody) => api.publishRecipe(body),
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: ['published'] }),
  });
};

export const useUnpublishRecipe = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.unpublishRecipe(id),
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: ['published'] }),
  });
};

/* ── Ratings and comments ───────────────────────────────────────────────── */

export function useMyRating(publishedId: string | undefined) {
  const { session } = useSession();
  const accountId = session.user?.id ?? '';
  return useQuery({
    queryKey: queryKeys.rating(publishedId ?? '', accountId),
    queryFn: () => api.getMyRating(publishedId!),
    enabled: !!publishedId && !!accountId,
    ...REMOTE,
  });
}

export const useRateRecipe = (publishedId: string, slug: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { stars?: number | null; baked?: boolean }) => api.rateRecipe(publishedId, body),
    networkMode: 'always',
    onSuccess: (result) => {
      client.setQueryData(queryKeys.publishedRecipe(slug), (prev: PublishedRecipe | undefined) =>
        prev ? { ...prev, stats: result.stats } : prev,
      );
      void client.invalidateQueries({ queryKey: ['published', 'rating', publishedId] });
    },
  });
};

export const useComments = (publishedId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.comments(publishedId ?? ''),
    queryFn: async () => (await api.getComments(publishedId!)).items,
    enabled: !!publishedId,
    ...REMOTE,
  });

export const usePostComment = (publishedId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.postComment(publishedId, body),
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.comments(publishedId) }),
  });
};

export const useDeleteComment = (publishedId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteComment(id),
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.comments(publishedId) }),
  });
};

/* ── Profiles and moderation ────────────────────────────────────────────── */

export const useProfile = (handle: string | undefined) =>
  useQuery({
    queryKey: queryKeys.profile(handle ?? ''),
    queryFn: () => api.getProfile(handle!),
    enabled: !!handle,
    ...REMOTE,
  });

export const useModerationQueue = (enabled: boolean) =>
  useQuery({ queryKey: queryKeys.moderation(), queryFn: api.getModerationQueue, enabled, ...REMOTE, staleTime: 0 });
