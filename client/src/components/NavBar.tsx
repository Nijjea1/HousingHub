import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Mail, Menu, Moon, Plus, Sun, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/use-messages';
import { setTheme, useTheme } from '@/hooks/use-theme';
import { Wordmark } from './Logo';

const sections = [
  { path: '/listings', label: 'Listings' },
  { path: '/map', label: 'Map' },
  { path: '/resources', label: 'Guides' },
  { path: '/about', label: 'About' },
];

const iconButton =
  'relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const ThemeToggle = () => {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className={iconButton} onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`}>
      {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
};

const NavBar = () => {
  const { user } = useAuth();
  const { data: unread = 0 } = useUnreadCount(user?.id);
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location]);

  // A section stays highlighted on its sub-pages, e.g. Listings on /listings/<id>.
  const isActive = (path: string) =>
    location === path || (location.startsWith(`${path}/`) && !(path === '/profile' && location.startsWith('/profile/my-listings')));
  const name = user?.email?.split('@')[0] ?? '';

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur">
      <nav className="page flex h-14 items-center gap-6" aria-label="Main">
        <Link href="/" aria-label="LetMeKnock home">
          <Wordmark />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {sections.map((s) => (
            <li key={s.path}>
              <Link
                href={s.path}
                aria-current={isActive(s.path) ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive(s.path) ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1">
          {user && (
            <Link
              href="/profile/my-listings"
              aria-current={isActive('/profile/my-listings') ? 'page' : undefined}
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground lg:inline-flex"
            >
              My listings
            </Link>
          )}
          <Link
            href="/create-listing"
            className="mr-1 hidden items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent md:inline-flex"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Post a listing
          </Link>
          <ThemeToggle />
          {user && (
            <Link href="/inbox" className={iconButton} aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}>
              <Mail className="h-4 w-4" aria-hidden="true" />
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground"
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
          )}
          {user ? (
            <Link
              href="/profile"
              aria-label="Your profile"
              aria-current={isActive('/profile') ? 'page' : undefined}
              className="ml-1 hidden items-center gap-2 rounded-md py-1 pl-1 pr-2 text-sm hover:bg-accent sm:flex"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase text-secondary-foreground">
                {name.charAt(0)}
              </span>
              <span className="max-w-[10rem] truncate">{name}</span>
            </Link>
          ) : (
            <Link
              href="/signin"
              className="ml-1 hidden rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            className={`${iconButton} md:hidden`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="border-t md:hidden">
          <ul className="page flex flex-col py-2">
            {[
              ...sections,
              { path: '/create-listing', label: 'Post a listing' },
              ...(user
                ? [
                    { path: '/profile/my-listings', label: 'My listings' },
                    { path: '/profile', label: 'Your profile' },
                  ]
                : [{ path: '/signin', label: 'Sign in' }]),
            ].map((s) => (
              <li key={s.path}>
                <Link
                  href={s.path}
                  aria-current={isActive(s.path) ? 'page' : undefined}
                  className={`block rounded-md px-3 py-3 text-base ${isActive(s.path) ? 'bg-accent font-medium' : 'text-muted-foreground'}`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
};

export default NavBar;
