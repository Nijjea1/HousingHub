import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/lib/api';
import { filtersToQuery } from '@shared/filters';
import { searchToQuery } from '@shared/search';
import {
  DEFAULT_LISTING_FILTERS,
  type Listing,
  type ListingFilters,
  type ListingInput,
  type SearchParams,
  type SearchResult,
} from '@shared/schema';

const listingKeys = {
  all: ['listings'] as const,
  list: (filters: ListingFilters) => [...listingKeys.all, 'list', filters] as const,
  search: (params: SearchParams) => [...listingKeys.all, 'search', params] as const,
  byUser: (userId: string) => [...listingKeys.all, 'user', userId] as const,
  detail: (id: string) => [...listingKeys.all, 'detail', id] as const,
};

/** Available listings, filtered and sorted by the API. */
export function useListings(filters: ListingFilters = DEFAULT_LISTING_FILTERS) {
  return useQuery({
    queryKey: listingKeys.list(filters),
    // Keep showing the last results while a new filter combination loads.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const query = filtersToQuery(filters).toString();
      const { listings } = await apiFetch<{ listings: Listing[] }>(`/listings${query ? `?${query}` : ''}`);
      return listings;
    },
  });
}

/** Listings near a point with the browse filters, nearest first when asked. Powers the browse list and the map. */
export function useSearchResults(params: SearchParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: listingKeys.search(params),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const query = searchToQuery(params).toString();
      return (await apiFetch<{ results: SearchResult[] }>(`/search${query ? `?${query}` : ''}`)).results;
    },
  });
}

export function useUserListings(userId: string | undefined) {
  return useQuery({
    queryKey: listingKeys.byUser(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => (await apiFetch<{ listings: Listing[] }>('/listings?mine=true')).listings,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Listing | null> => {
      try {
        return (await apiFetch<{ listing: Listing }>(`/listings/${id}`)).listing;
      } catch (err) {
        // A missing listing (or a malformed id in the URL) is "not found", not an error page.
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
        throw err;
      }
    },
  });
}

export function useListingMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: listingKeys.all });

  const createListing = useMutation({
    mutationFn: async (input: ListingInput) =>
      (await apiFetch<{ listing: Listing }>('/listings', { method: 'POST', body: input })).listing,
    onSuccess: invalidate,
  });

  const updateListing = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ListingInput> }) =>
      (await apiFetch<{ listing: Listing }>(`/listings/${id}`, { method: 'PATCH', body: input })).listing,
    onSuccess: invalidate,
  });

  const deleteListing = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/listings/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  return { createListing, updateListing, deleteListing };
}
