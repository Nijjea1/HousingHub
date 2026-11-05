/** /api/favorites: the signed-in user's saved listings, with a private note and collection. */
import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { favoriteFromRecord, savedListingFromRow, type FavoriteRow, type ListingRow } from "../shared/mappers.js";
import { favoriteInputSchema } from "../shared/schema.js";
import { requireUser } from "./auth.js";
import { asUser, rowsOf } from "./db/client.js";
import { favorites } from "./db/schema.js";
import { dbOf, guard } from "./db/use.js";
import type { AppDeps } from "./deps.js";
import { HttpError, asyncHandler, parseInput } from "./http.js";
import { limitersFor } from "./rate-limit.js";

const listingIdSchema = z.string().uuid("Not a valid listing id");

export function favoritesRouter(deps: AppDeps) {
  const router = Router();
  const limit = limitersFor(deps);

  router.get(
    "/",
    requireUser,
    limit.read,
    asyncHandler(async (_req, res) => {
      const me = res.locals.user!.id;
      const result = await guard(() =>
        asUser(dbOf(deps), me, (tx) =>
          tx.execute(sql`
            select to_jsonb(f) as favorite, to_jsonb(l) - 'location' as listing
            from public.favorites f join public.listings l on l.id = f.listing_id
            where f.user_id = ${me}
            order by f.created_at desc`),
        ),
      );
      const saved = rowsOf<{ favorite: FavoriteRow; listing: ListingRow }>(result)
        .map((r) => savedListingFromRow({ ...r.favorite, listing: r.listing }))
        .filter((s) => s !== null);
      res.json({ favorites: saved });
    }),
  );

  // Saves the listing, or updates the note and collection if it's already saved.
  router.put(
    "/:listingId",
    requireUser,
    limit.write,
    asyncHandler(async (req, res) => {
      const listingId = parseInput(listingIdSchema, req.params.listingId);
      const { note, collectionName } = parseInput(favoriteInputSchema, req.body ?? {});
      const me = res.locals.user!.id;
      const [row] = await guard(() =>
        asUser(dbOf(deps), me, (tx) =>
          tx
            .insert(favorites)
            .values({ userId: me, listingId, note, collectionName })
            .onConflictDoUpdate({ target: [favorites.userId, favorites.listingId], set: { note, collectionName } })
            .returning(),
        ),
      );
      res.json({ favorite: favoriteFromRecord(row) });
    }),
  );

  router.delete(
    "/:listingId",
    requireUser,
    limit.write,
    asyncHandler(async (req, res) => {
      const listingId = parseInput(listingIdSchema, req.params.listingId);
      const me = res.locals.user!.id;
      const removed = await guard(() =>
        asUser(dbOf(deps), me, (tx) =>
          tx.delete(favorites).where(and(eq(favorites.userId, me), eq(favorites.listingId, listingId))).returning({ id: favorites.id }),
        ),
      );
      if (removed.length === 0) throw new HttpError(404, "That listing isn't in your favorites");
      res.status(204).end();
    }),
  );

  return router;
}
