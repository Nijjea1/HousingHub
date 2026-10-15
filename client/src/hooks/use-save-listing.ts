import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoritesContext } from '@/hooks/use-favorites';
import { signInHref } from '@/lib/redirect';

/** Save or unsave one listing. Signed out, it offers to sign in and come back. */
export function useSaveListing(listingId: string) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesContext();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const saved = isFavorite(listingId);

  const toggle = async () => {
    if (!user) {
      const here = window.location.pathname + window.location.search;
      toast('Sign in to save listings', { action: { label: 'Sign in', onClick: () => navigate(signInHref(here)) } });
      return;
    }
    try {
      if (saved) {
        await removeFavorite(listingId);
        toast.success('Removed from saved');
      } else {
        await addFavorite(listingId);
        toast.success('Saved');
      }
    } catch {
      toast.error('Could not update your saved listings');
    }
  };

  return { saved, toggle };
}
