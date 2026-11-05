/** Viewing requests: a student proposes a time, the listing's owner accepts or declines. */
import { asc, eq, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { viewingRequestFromRecord } from "../shared/mappers.js";
import { viewingRequestInputSchema, viewingStatusUpdateSchema } from "../shared/schema.js";
import { requireUser } from "./auth.js";
import { asUser } from "./db/client.js";
import { listings, viewingRequests } from "./db/schema.js";
import { dbOf, guard } from "./db/use.js";
import type { AppDeps } from "./deps.js";
import { HttpError, asyncHandler, parseInput } from "./http.js";
import { limitersFor } from "./rate-limit.js";

const idSchema = z.string().uuid("Not a valid id");

/** Mounted at /api because the routes live under both /listings/:id and /viewings. */
export function viewingsRouter(deps: AppDeps) {
  const router = Router();
  const limit = limitersFor(deps);
  const now = deps.now ?? Date.now;

  router.post(
    "/listings/:id/viewings",
    requireUser,
    limit.write,
    asyncHandler(async (req, res) => {
      const listingId = parseInput(idSchema, req.params.id);
      const { proposedAt, message } = parseInput(viewingRequestInputSchema, req.body);
      if (new Date(proposedAt).getTime() <= now()) {
        throw new HttpError(400, "Pick a time in the future", { proposedAt: ["Pick a time in the future"] });
      }
      const me = res.locals.user!.id;

      const row = await guard(() =>
        asUser(dbOf(deps), me, async (tx) => {
          const [listing] = await tx.select({ userId: listings.userId }).from(listings).where(eq(listings.id, listingId));
          if (!listing) throw new HttpError(404, "Listing not found");
          if (listing.userId === me) throw new HttpError(400, "This is your own listing");
          const [created] = await tx
            .insert(viewingRequests)
            .values({ listingId, studentId: me, landlordId: listing.userId, proposedAt, message })
            .returning();
          return created;
        }),
      );
      const viewingRequest = viewingRequestFromRecord(row);
      void deps.publish?.({ userId: viewingRequest.landlordId, type: "viewing:requested", payload: { viewingRequest } });
      res.status(201).json({ viewingRequest });
    }),
  );

  // Requests the caller made as a student and requests for listings they own, soonest first.
  router.get(
    "/viewings",
    requireUser,
    limit.read,
    asyncHandler(async (_req, res) => {
      const me = res.locals.user!.id;
      const rows = await guard(() =>
        asUser(dbOf(deps), me, (tx) =>
          tx
            .select()
            .from(viewingRequests)
            .where(or(eq(viewingRequests.studentId, me), eq(viewingRequests.landlordId, me)))
            .orderBy(asc(viewingRequests.proposedAt)),
        ),
      );
      res.json({ viewingRequests: rows.map(viewingRequestFromRecord) });
    }),
  );

  router.patch(
    "/viewings/:id",
    requireUser,
    limit.write,
    asyncHandler(async (req, res) => {
      const id = parseInput(idSchema, req.params.id);
      const { status } = parseInput(viewingStatusUpdateSchema, req.body);
      const me = res.locals.user!.id;
      // Row level security only lets the listing's owner update, so anyone else gets zero rows.
      const [row] = await guard(() =>
        asUser(dbOf(deps), me, (tx) => tx.update(viewingRequests).set({ status }).where(eq(viewingRequests.id, id)).returning()),
      );
      if (!row) throw new HttpError(404, "Viewing request not found");
      const viewingRequest = viewingRequestFromRecord(row);
      void deps.publish?.({ userId: viewingRequest.studentId, type: "viewing:answered", payload: { viewingRequest } });
      res.json({ viewingRequest });
    }),
  );

  return router;
}
