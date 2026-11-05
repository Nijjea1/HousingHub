/** /api/saved-searches: named searches a user can come back to. */
import { and, desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { savedSearchFromRecord } from "../shared/mappers.js";
import { savedSearchInputSchema } from "../shared/schema.js";
import { requireUser } from "./auth.js";
import { asUser } from "./db/client.js";
import { savedSearches } from "./db/schema.js";
import { dbOf, guard } from "./db/use.js";
import type { AppDeps } from "./deps.js";
import { HttpError, asyncHandler, parseInput } from "./http.js";
import { limitersFor } from "./rate-limit.js";

export const MAX_SAVED_SEARCHES = 25;
const idSchema = z.string().uuid("Not a valid saved search id");

export function savedSearchesRouter(deps: AppDeps) {
  const router = Router();
  const limit = limitersFor(deps);

  router.get(
    "/",
    requireUser,
    limit.read,
    asyncHandler(async (_req, res) => {
      const me = res.locals.user!.id;
      const rows = await guard(() =>
        asUser(dbOf(deps), me, (tx) => tx.select().from(savedSearches).where(eq(savedSearches.userId, me)).orderBy(desc(savedSearches.createdAt))),
      );
      res.json({ savedSearches: rows.map(savedSearchFromRecord) });
    }),
  );

  router.post(
    "/",
    requireUser,
    limit.write,
    asyncHandler(async (req, res) => {
      const input = parseInput(savedSearchInputSchema, req.body);
      const me = res.locals.user!.id;
      const row = await guard(() =>
        asUser(dbOf(deps), me, async (tx) => {
          const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(savedSearches).where(eq(savedSearches.userId, me));
          if (n >= MAX_SAVED_SEARCHES) throw new HttpError(400, `You can save up to ${MAX_SAVED_SEARCHES} searches`);
          const [created] = await tx.insert(savedSearches).values({ userId: me, name: input.name, params: input.params }).returning();
          return created;
        }),
      );
      res.status(201).json({ savedSearch: savedSearchFromRecord(row) });
    }),
  );

  router.delete(
    "/:id",
    requireUser,
    limit.write,
    asyncHandler(async (req, res) => {
      const id = parseInput(idSchema, req.params.id);
      const me = res.locals.user!.id;
      const removed = await guard(() =>
        asUser(dbOf(deps), me, (tx) =>
          tx.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, me))).returning({ id: savedSearches.id }),
        ),
      );
      if (removed.length === 0) throw new HttpError(404, "Saved search not found");
      res.status(204).end();
    }),
  );

  return router;
}
