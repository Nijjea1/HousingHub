/** Fixed-window rate limiting: at most `limit` hits per key in each `windowMs` window. */
import type { RequestHandler } from "express";
import { HttpError } from "./http.js";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

const PRUNE_ABOVE = 10_000;

export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions) {
  const windows = new Map<string, { start: number; count: number }>();

  return function hit(key: string): RateLimitResult {
    const t = now();
    let window = windows.get(key);
    if (!window || t - window.start >= windowMs) {
      window = { start: t, count: 0 };
      windows.set(key, window);
    }
    window.count += 1;

    // Keep memory bounded when many distinct keys pass through.
    if (windows.size > PRUNE_ABOVE) {
      for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k);
    }

    return {
      allowed: window.count <= limit,
      remaining: Math.max(0, limit - window.count),
      resetAt: window.start + windowMs,
    };
  };
}

/** Express middleware: 429 once a key goes over its limit. Keys by signed-in user, else IP. */
export function rateLimit(options: RateLimiterOptions): RequestHandler {
  const hit = createRateLimiter(options);
  const now = options.now ?? Date.now;
  return (req, res, next) => {
    const key = res.locals.user?.id ?? req.ip ?? "unknown";
    const result = hit(key);
    res.setHeader("RateLimit-Limit", options.limit);
    res.setHeader("RateLimit-Remaining", result.remaining);
    if (!result.allowed) {
      res.setHeader("Retry-After", Math.ceil((result.resetAt - now()) / 1000));
      next(new HttpError(429, "Too many requests, try again shortly"));
      return;
    }
    next();
  };
}
