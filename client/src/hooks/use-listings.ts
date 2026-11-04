import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { listingFromRow, listingToRow, type ListingRow } from '@shared/mappers';
import type { Listing, ListingInput } from '@shared/schema';

const listingKeys = {
  all: ['listings'] as const,
  list: () => [...listingKeys.all, 'list'] as const,
  byUser: (userId: string) => [...listingKeys.all, 'user', userId] as const,
  detail: (id: string) => [...listingKeys.all, 'detail', id] as const,
};

export function useListings() {
  return useQuery({
    queryKey: listingKeys.list(),
    queryFn: async (): Promise<Listing[]> => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ListingRow[]).map(listingFromRow);
    },
  });
}

export function useUserListings(userId: string | undefined) {
  return useQuery({
    queryKey: listingKeys.byUser(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<Listing[]> => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ListingRow[]).map(listingFromRow);
    },
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Listing | null> => {
      const { data, error } = await supabase.from('listings').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data ? listingFromRow(data as ListingRow) : null;
    },
  });
}

export function useListingMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: listingKeys.all });

  const createListing = useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: ListingInput }) => {
      const { data, error } = await supabase
        .from('listings')
        .insert({ ...listingToRow(input), user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return listingFromRow(data as ListingRow);
    },
    onSuccess: invalidate,
  });

  const updateListing = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ListingInput }) => {
      const { data, error } = await supabase
        .from('listings')
        .update(listingToRow(input))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return listingFromRow(data as ListingRow);
    },
    onSuccess: invalidate,
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createListing, updateListing, deleteListing };
}
