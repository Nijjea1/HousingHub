import { useQueries } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/lib/api';
import { COMMUTE_MODES, type Commute, type CommuteMode } from '@shared/schema';

/**
 * Commute from a listing to its campus for every mode. A mode the server can't answer (no provider key,
 * no route) comes back as an error and the UI leaves it out; nothing is estimated here.
 */
export function useCommutes(listingId: string | undefined) {
  const results = useQueries({
    queries: COMMUTE_MODES.map((mode) => ({
      queryKey: ['commute', listingId, mode],
      enabled: !!listingId,
      retry: false,
      staleTime: 24 * 3600 * 1000,
      queryFn: async () => (await apiFetch<{ commute: Commute }>(`/listings/${listingId}/commute?mode=${mode}`)).commute,
    })),
  });

  const byMode = {} as Record<CommuteMode, Commute | null>;
  COMMUTE_MODES.forEach((mode, i) => {
    byMode[mode] = results[i].data ?? null;
  });
  const pending = results.some((r) => r.isPending && r.fetchStatus !== 'idle');
  // Every mode failing with 503 means the provider isn't configured: hide the whole section.
  const unavailable = results.every((r) => r.error instanceof ApiError && r.error.status === 503);

  return { byMode, pending, unavailable };
}
