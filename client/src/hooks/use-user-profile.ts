import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PROFILE_PICTURES_BUCKET, uploadImage } from '@/lib/storage';
import {
  preferencesFromRow,
  preferencesToRow,
  profileFromRow,
  type PreferencesRow,
  type ProfileRow,
} from '@shared/mappers';
import type { Preferences, Profile, ProfileUpdate } from '@shared/schema';

const profileKey = (userId: string) => ['profile', userId] as const;
const preferencesKey = (userId: string) => ['preferences', userId] as const;

/** Public profile of any user, e.g. the landlord on a listing page. */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKey(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      if (error) throw error;
      return data ? profileFromRow(data as ProfileRow) : null;
    },
  });
}

/** The signed-in user's own profile and private preferences, with update actions. */
export function useUserProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  const profile = useProfile(userId);

  const preferences = useQuery({
    queryKey: preferencesKey(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<Preferences> => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return preferencesFromRow(data as PreferencesRow | null);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (update: ProfileUpdate) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: update.fullName,
          university_id: update.universityId,
          avatar_url: update.avatarUrl,
        })
        .eq('id', userId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey(userId!) }),
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: Preferences) => {
      const { error } = await supabase.from('user_preferences').upsert(preferencesToRow(userId!, prefs));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preferencesKey(userId!) }),
  });

  const uploadAvatar = (file: File) => uploadImage(file, PROFILE_PICTURES_BUCKET, userId!);

  return {
    profile: profile.data ?? null,
    preferences: preferences.data ?? null,
    isLoading: profile.isLoading || preferences.isLoading,
    error: profile.error ?? preferences.error,
    updateProfile,
    updatePreferences,
    uploadAvatar,
  };
}
