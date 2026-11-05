/** Reviews of a listing: public to read, one per signed-in user, never by the listing's owner. */
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { reviewFromRecord } from "../shared/mappers.js";
import { reviewInputSchema } from "../shared/schema.js";
import { requireUser } from "./auth.js";
import { asUser, type Tx } from "./db/client.js";
import { listings, profiles, reviews } from "./db/schema.js";
import { dbOf, guard } from "./db/use.js";
import type { AppDeps } from "./deps.js";
import { HttpError, asyncHandler, parseInput } from "./http.js";
import { limitersFor } from "./rate-limit.js";

const idSchema = z.string().uuid("Not a valid listing id");

const reviewColumns = {
  id: reviews.id,
  listingId: reviews.listingId,
  authorId: reviews.authorId,
  authorName: profiles.fullName,
  rating: reviews.rating,
  body: reviews.body,
  createdAt: reviews.createdAt,
};

const withAuthor = (tx: Tx) => tx.select(reviewColumns).from(reviews).leftJoin(profiles, eq(profiles.id, reviews.authorId));

export function reviewsRouter(deps: AppDeps) {
  const router = Router();
  const limit = limitersFor(deps);

  router.get(
    "/listings/:id/reviews",
    limit.read,
    asyncHandler(async (req, res) => {
      const listingId = parseInput(idSchema, req.params.id);
      const rows = await guard(() =>
        asUser(dbOf(deps), res.locals.user?.id ?? null, (tx) =>
          withAuthor(tx).where(eq(reviews.listingId, listingId)).orderBy(desc(reviews.createdAt)),
        ),
      );
      const list = rows.map(reviewFromRecord);
      const average = list.length ? Math.round((list.reduce((sum, r) => sum + r.rating, 0) / list.length) * 10) / 10 : null;
      res.json({ reviews: list, count: list.length, average });
    }),
  );

  router.post(
    "/listings/:id/reviews",
    requireUser,
    limit.write,
    asyncHandler(async (req, res) => {
      const listingId = parseInput(idSchema, req.params.id);
      const { rating, body } = parseInput(reviewInputSchema, req.body);
      const me = res.locals.user!.id;
      const row = await guard(() =>
        asUser(dbOf(deps), me, async (tx) => {
          const [listing] = await tx.select({ id: listings.id }).from(listings).where(eq(listings.id, listingId));
          if (!listing) throw new HttpError(404, "Listing not found");
          const [created] = await tx.insert(reviews).values({ listingId, authorId: me, rating, body }).returning({ id: reviews.id });
          const [full] = await withAuthor(tx).where(eq(reviews.id, created.id));
          return full;
        }),
      );
      res.status(201).json({ review: reviewFromRecord(row) });
    }),
  );

  return router;
}
