/** /api/listings: browse, read, create, update and delete listings. */
import { Router } from "express";
import { z } from "zod";
import {
  MAX_SEARCH_LIMIT,
  listingFiltersQuerySchema,
  listingInputSchema,
  type Listing,
  type ListingInput,
} from "../shared/schema.js";
import { requireUser } from "./auth.js";
import type { AddressQuery, AppDeps } from "./deps.js";
import { HttpError, asyncHandler, parseInput } from "./http.js";
import { rateLimit } from "./rate-limit.js";

const idSchema = z.string().uuid("Not a valid listing id");
const ADDRESS_FIELDS = ["address", "city", "province"] as const;

const addressOf = (l: ListingInput): AddressQuery => ({
  address: l.address,
  city: l.city,
  province: l.province,
});

export function listingsRouter(deps: AppDeps) {
  const router = Router();
  const limits = deps.limits ?? { readsPerMinute: 120, writesPerMinute: 20 };
  const readLimit = rateLimit({ limit: limits.readsPerMinute, windowMs: 60_000, now: deps.now });
  const writeLimit = rateLimit({ limit: limits.writesPerMinute, windowMs: 60_000, now: deps.now });
  const store = (token: string | undefined) => deps.listingsFor(token ?? null);

  // Coordinates always come from the geocoder, never from the client.
  const withCoordinates = async (input: ListingInput): Promise<ListingInput> => {
    const coords = await deps.geocode(addressOf(input));
    return { ...input, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null };
  };

  /** Loads a listing and checks the caller owns it. RLS enforces the same rule again in the database. */
  const loadOwned = async (id: string, userId: string, token: string | undefined): Promise<Listing> => {
    const listing = await store(token).get(parseInput(idSchema, id));
    if (!listing) throw new HttpError(404, "Listing not found");
    if (listing.userId !== userId) throw new HttpError(403, "You can only change your own listings");
    return listing;
  };

  router.get(
    "/",
    readLimit,
    asyncHandler(async (req, res) => {
      if (req.query.mine === "true") {
        if (!res.locals.user) throw new HttpError(401, "Sign in required");
        res.json({ listings: await store(res.locals.token).listByOwner(res.locals.user.id) });
        return;
      }
      const { mine: _mine, ...query } = req.query;
      const filters = parseInput(listingFiltersQuerySchema, query);
      // The same search as /api/search, just without a location.
      const results = await store(res.locals.token).search({ center: null, radiusKm: null, filters, limit: MAX_SEARCH_LIMIT });
      res.json({ listings: results.map((r) => r.listing) });
    }),
  );

  router.get(
    "/:id",
    readLimit,
    asyncHandler(async (req, res) => {
      const listing = await store(res.locals.token).get(parseInput(idSchema, req.params.id));
      if (!listing) throw new HttpError(404, "Listing not found");
      res.json({ listing });
    }),
  );

  router.post(
    "/",
    requireUser,
    writeLimit,
    asyncHandler(async (req, res) => {
      const input = await withCoordinates(parseInput(listingInputSchema, req.body));
      const listing = await store(res.locals.token).create(res.locals.user!.id, input);
      res.status(201).json({ listing });
    }),
  );

  router.patch(
    "/:id",
    requireUser,
    writeLimit,
    asyncHandler(async (req, res) => {
      const existing = await loadOwned(req.params.id, res.locals.user!.id, res.locals.token);
      const patch = parseInput(listingInputSchema.partial(), req.body);
      // Re-validate the merged listing so a partial update can't leave it in an invalid state.
      let merged = parseInput(listingInputSchema, { ...existing, ...patch });
      if (ADDRESS_FIELDS.some((f) => f in patch && patch[f] !== existing[f])) {
        merged = await withCoordinates(merged);
      } else {
        merged = { ...merged, latitude: existing.latitude, longitude: existing.longitude };
      }
      const listing = await store(res.locals.token).update(existing.id, merged);
      if (!listing) throw new HttpError(404, "Listing not found");
      res.json({ listing });
    }),
  );

  router.delete(
    "/:id",
    requireUser,
    writeLimit,
    asyncHandler(async (req, res) => {
      const existing = await loadOwned(req.params.id, res.locals.user!.id, res.locals.token);
      if (!(await store(res.locals.token).remove(existing.id))) throw new HttpError(404, "Listing not found");
      res.status(204).end();
    }),
  );

  return router;
}
