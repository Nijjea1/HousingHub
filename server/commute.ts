/** GET /api/listings/:id/commute: minutes and route from a listing to its campus. Cached for 30 days. */
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { commuteFromRecord } from "../shared/mappers.js";
import { commuteQuerySchema } from "../shared/schema.js";
import { asUser } from "./db/client.js";
import { commuteCache, listings, universities } from "./db/schema.js";
import { dbOf, guard } from "./db/use.js";
import type { AppDeps } from "./deps.js";
import { HttpError, asyncHandler, parseInput } from "./http.js";
import { limitersFor } from "./rate-limit.js";

export const COMMUTE_CACHE_MS = 30 * 24 * 3600 * 1000;
const idSchema = z.string().uuid("Not a valid listing id");

export function commuteRouter(deps: AppDeps) {
  const router = Router();
  const limit = limitersFor(deps);
  const now = deps.now ?? Date.now;

  router.get(
    "/listings/:id/commute",
    limit.read,
    asyncHandler(async (req, res) => {
      const listingId = parseInput(idSchema, req.params.id);
      const { mode } = parseInput(commuteQuerySchema, req.query);
      const db = dbOf(deps);
      const viewer = res.locals.user?.id ?? null;

      const found = await guard(() =>
        asUser(db, viewer, async (tx) => {
          const [listing] = await tx
            .select({ latitude: listings.latitude, longitude: listings.longitude, universityId: listings.universityId })
            .from(listings)
            .where(eq(listings.id, listingId));
          if (!listing) return null;
          const [campus] = listing.universityId
            ? await tx.select({ latitude: universities.latitude, longitude: universities.longitude }).from(universities).where(eq(universities.id, listing.universityId))
            : [];
          const [cached] = await tx
            .select()
            .from(commuteCache)
            .where(and(eq(commuteCache.listingId, listingId), eq(commuteCache.mode, mode)));
          return { listing, campus, cached };
        }),
      );
      if (!found) throw new HttpError(404, "Listing not found");

      const { listing, campus, cached } = found;
      if (cached && now() - new Date(cached.fetchedAt.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).getTime() < COMMUTE_CACHE_MS) {
        res.json({ commute: commuteFromRecord(cached) });
        return;
      }

      if (listing.latitude === null || listing.longitude === null) throw new HttpError(422, "This listing has no map location yet");
      if (!campus) throw new HttpError(422, "This listing isn't linked to a campus");
      if (!deps.routing?.supports(mode)) throw new HttpError(503, `${mode === "transit" ? "Transit" : "Commute"} times are not configured`);

      let route;
      try {
        route = await deps.routing.route(
          mode,
          { latitude: Number(listing.latitude), longitude: Number(listing.longitude) },
          { latitude: Number(campus.latitude), longitude: Number(campus.longitude) },
        );
      } catch (err) {
        console.warn("Commute lookup failed:", err instanceof Error ? err.message : err);
        throw new HttpError(502, "The routing service didn't answer, try again shortly");
      }
      if (!route) throw new HttpError(404, "No route found for that mode");

      // Writing the cache is the server's job: the connection bypasses RLS, and users have no write access.
      const values = { listingId, mode, minutes: String(route.minutes), distanceM: route.distanceM, geometry: route.geometry };
      const fetchedAt = new Date(now()).toISOString();
      const [saved] = await db
        .insert(commuteCache)
        .values({ ...values, fetchedAt })
        .onConflictDoUpdate({ target: [commuteCache.listingId, commuteCache.mode], set: { ...values, fetchedAt } })
        .returning();
      res.json({ commute: commuteFromRecord(saved) });
    }),
  );

  return router;
}
