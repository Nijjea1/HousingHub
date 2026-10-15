import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-user-profile';
import { useUniversities } from '@/hooks/use-universities';
import { pickCampus } from '@/lib/map';
import type { University } from '@shared/schema';

/**
 * The campus searches measure from: the signed-in user's university, else McMaster.
 * `ready` turns true once that's settled (even if loading failed), so a search waits for it
 * instead of running once without a campus and again with one.
 */
export function useCampus(): { campus: University | null; ready: boolean } {
  const { user, loading: authLoading } = useAuth();
  const profile = useProfile(user?.id);
  const universities = useUniversities();
  const ready = !authLoading && !universities.isPending && (!user || !profile.isPending);
  return { campus: pickCampus(universities.data ?? [], profile.data?.universityId), ready };
}
