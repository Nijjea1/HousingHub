/** Where to go after signing in, from a `?next=` query parameter. Only paths on this site are allowed. */
export function safeNextPath(search: string, fallback = '/profile'): string {
  const next = new URLSearchParams(search).get('next');
  // "/x" is a path on this site; "//evil.com" and "/\evil.com" point browsers at another origin.
  return next && /^\/(?![/\\])/.test(next) ? next : fallback;
}

/** A sign-in link that brings the user back to `path` afterwards. */
export const signInHref = (path: string) => `/signin?next=${encodeURIComponent(path)}`;
