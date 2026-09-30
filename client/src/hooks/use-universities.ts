import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { universityFromRow, type UniversityRow } from '@shared/mappers';
import type { University } from '@shared/schema';

/** Universities the platform currently serves, sorted by name. */
export function useUniversities() {
  return useQuery({
    queryKey: ['universities'],
    staleTime: Infinity,
    queryFn: async (): Promise<University[]> => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data as UniversityRow[]).map(universityFromRow);
    },
  });
}
