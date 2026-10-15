/** Reads the Supabase JWT from the Authorization header. */
import type { RequestHandler } from "express";
import type { AppDeps, AuthUser } from "./deps.js";
import { HttpError, asyncHandler } from "./http.js";

/** Sets res.locals.user when a valid token is sent. A token that fails to verify is a 401, not anonymous. */
export function authenticate(deps: Pick<AppDeps, "verifyToken">): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return next();

    const match = /^Bearer (.+)$/.exec(header);
    if (!match) throw new HttpError(401, "Use an Authorization: Bearer <token> header");

    const user = await deps.verifyToken(match[1]);
    if (!user) throw new HttpError(401, "Your session has expired, sign in again");

    res.locals.user = user;
    res.locals.token = match[1];
    next();
  });
}

export const requireUser: RequestHandler = (_req, res, next) => {
  next(res.locals.user ? undefined : new HttpError(401, "Sign in required"));
};

/** Reads a JWT's `exp` claim without verifying it; only used on tokens Supabase already verified. */
function expiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Remembers verified tokens for up to `ttlMs`, and never past the token's own expiry, so each request
 * doesn't wait on a round trip to Supabase. Failed verifications are never cached.
 */
export function cacheVerifiedTokens(
  verify: AppDeps["verifyToken"],
  { ttlMs = 60_000, maxEntries = 1000, now = Date.now }: { ttlMs?: number; maxEntries?: number; now?: () => number } = {},
): AppDeps["verifyToken"] {
  const cache = new Map<string, { user: AuthUser; until: number }>();
  return async (token) => {
    const t = now();
    const hit = cache.get(token);
    if (hit && hit.until > t) return hit.user;
    cache.delete(token);

    const user = await verify(token);
    if (!user) return null;
    const until = Math.min(t + ttlMs, expiryMs(token) ?? Infinity);
    if (until > t) {
      // Maps keep insertion order, so the first key is the oldest entry.
      if (cache.size >= maxEntries) cache.delete(cache.keys().next().value!);
      cache.set(token, { user, until });
    }
    return user;
  };
}
