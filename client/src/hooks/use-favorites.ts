import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, ReactNode } from 'react';
import { favoriteFromRow, savedListingFromRow, type FavoriteRow, type ListingRow } from '@shared/mappers';
import type { Favorite, SavedListing } from '@shared/schema';

interface FavoritesContextType {
  favorites: Favorite[] | undefined;
  isLoading: boolean;
  isFavorite: (listingId: string) => boolean;
  addFavorite: (listingId: string) => Promise<void>;
  removeFavorite: (listingId: string) => Promise<void>;
  getFavoriteNote: (listingId: string) => string | null | undefined;
  addNoteToFavorite: (listingId: string, note: string) => Promise<void>;
  collections: string[];
  /** Puts a saved listing in a collection, or takes it out with null. Saves the listing if it wasn't. */
  setCollection: (listingId: string, collectionName: string | null) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
  userId: string;
}

export function FavoritesProvider({ children, userId }: FavoritesProviderProps) {
  const {
    favorites,
    isLoading,
    isFavorite,
    addFavorite: addFavoriteMutation,
    removeFavorite: removeFavoriteMutation,
    getFavoriteNote,
    addNoteToFavorite,
    collections,
    setCollection
  } = useFavorites(userId);
  
  const value: FavoritesContextType = {
    favorites,
    isLoading,
    isFavorite,
    addFavorite: async (listingId: string) => {
      await addFavoriteMutation(listingId);
    },
    removeFavorite: async (listingId: string) => {
      await removeFavoriteMutation(listingId);
    },
    getFavoriteNote,
    addNoteToFavorite,
    collections,
    setCollection
  };

  return React.createElement(FavoritesContext.Provider, { value }, children);
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}

export function useFavorites(userId: string) {
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return (data as FavoriteRow[]).map(favoriteFromRow);
    },
    enabled: !!userId,
  });

  const requireUser = () => {
    if (!userId) throw new Error('Sign in to save listings');
  };

  const addFavorite = useMutation({
    mutationFn: async (listingId: string) => {
      requireUser();
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, listing_id: listingId })
        .select()
        .single();

      if (error) throw error;
      return favoriteFromRow(data as FavoriteRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (listingId: string) => {
      requireUser();
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', listingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });

  const addNoteToFavorite = useMutation({
    mutationFn: async ({ listingId, note }: { listingId: string; note: string }) => {
      requireUser();
      const { error } = await supabase
        .from('favorites')
        .upsert(
          { user_id: userId, listing_id: listingId, note: note.trim() || null },
          { onConflict: 'user_id,listing_id' }
        );
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });

  const collections = Array.from(
    new Set(
      favorites
        ?.map(fav => fav.collectionName)
        .filter((name): name is string => typeof name === 'string' && name.length > 0) ?? []
    )
  ).sort();

  // Collections are tags on favorites, so a collection exists while at least one favorite carries its name.
  const setCollection = useMutation({
    mutationFn: async ({ listingId, collectionName }: { listingId: string; collectionName: string | null }) => {
      requireUser();
      const name = collectionName?.trim() || null;
      const { error } = await supabase
        .from('favorites')
        .upsert(
          { user_id: userId, listing_id: listingId, collection_name: name },
          { onConflict: 'user_id,listing_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });

  const isFavorite = (listingId: string) => {
    return favorites?.some(fav => fav.listingId === listingId) ?? false;
  };

  const getFavoriteNote = (listingId: string) => {
    return favorites?.find(fav => fav.listingId === listingId)?.note;
  };

  return {
    favorites,
    isLoading,
    isFavorite,
    addFavorite: addFavorite.mutateAsync,
    removeFavorite: removeFavorite.mutateAsync,
    getFavoriteNote,
    addNoteToFavorite: (listingId: string, note: string) => addNoteToFavorite.mutateAsync({ listingId, note }),
    collections,
    setCollection: async (listingId: string, collectionName: string | null) => {
      await setCollection.mutateAsync({ listingId, collectionName });
    },
  };
} 
/**
 * The user's saved listings with full listing data, newest first, in one query. Includes listings
 * that are no longer available, unlike search. Its key sits under ['favorites', userId], so every
 * favorites change above refreshes it too.
 */
export function useSavedListings(userId: string | undefined) {
  return useQuery({
    queryKey: ['favorites', userId ?? '', 'listings'],
    enabled: !!userId,
    queryFn: async (): Promise<SavedListing[]> => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, listing:listings(*)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Array<FavoriteRow & { listing: ListingRow | null }>)
        .map(savedListingFromRow)
        .filter((s): s is SavedListing => s !== null);
    },
  });
}
