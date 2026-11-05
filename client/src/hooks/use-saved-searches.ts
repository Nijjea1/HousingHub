import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { SavedSearch, SavedSearchInput } from '@shared/schema';

export function useSavedSearches(userId: string | undefined) {
  return useQuery({
    queryKey: ['saved-searches', userId],
    enabled: !!userId,
    queryFn: async () => (await apiFetch<{ savedSearches: SavedSearch[] }>('/saved-searches')).savedSearches,
  });
}

export function useSavedSearchMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] });

  const save = useMutation({
    mutationFn: (input: SavedSearchInput) => apiFetch<{ savedSearch: SavedSearch }>('/saved-searches', { method: 'POST', body: input }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/saved-searches/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  return { save, remove };
}
