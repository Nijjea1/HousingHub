import type { ReactNode } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { signInHref } from '@/lib/redirect';

export const PageSpinner = ({ label }: { label: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label={label}>
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
  </div>
);

interface RequireAuthProps {
  /** Finishes "Sign in to ...", e.g. "see your saved listings". */
  reason: string;
  children: (user: User) => ReactNode;
}

/**
 * Renders the page only for a signed-in user. While the session is still loading it shows a
 * spinner, so a refresh doesn't flash "please sign in" or redirect someone who is signed in.
 */
const RequireAuth = ({ reason, children }: RequireAuthProps) => {
  const { user, loading } = useAuth();
  const [path] = useLocation();
  const search = useSearch();
  if (loading) return <PageSpinner label="Checking your session" />;
  if (!user) {
    return (
      <div className="page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="mb-2 text-3xl font-semibold">Sign in first</h1>
        <p className="text-muted-foreground mb-6">Sign in to {reason}.</p>
        <Button asChild>
          <Link href={signInHref(search ? `${path}?${search}` : path)}>Sign in</Link>
        </Button>
      </div>
    );
  }
  return <>{children(user)}</>;
};

export default RequireAuth;
