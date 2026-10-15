/** /api/search: listings near a point with the browse filters, and turning a sentence into those filters. */
import { Router } from "express";
import { parseSearch } from "../shared/parse-search.js";
import { parseSearchRequestSchema, parsedSearchSchema, searchQuerySchema } from "../shared/schema.js";
import type { AppDeps } from "./deps.js";
import { asyncHandler, parseInput } from "./http.js";
import { rateLimit } from "./rate-limit.js";

export function searchRouter(deps: AppDeps) {
  const router = Router();
  const limits = deps.limits ?? { readsPerMinute: 120, writesPerMinute: 20 };
  const readLimit = rateLimit({ limit: limits.readsPerMinute, windowMs: 60_000, now: deps.now });

  router.get(
    "/",
    readLimit,
    asyncHandler(async (req, res) => {
      const params = parseInput(searchQuerySchema, req.query);
      const results = await deps.listingsFor(res.locals.token ?? null).search(params);
      res.json({ results });
    }),
  );

  // POST because the sentence is free text that doesn't belong in URLs or server logs.
  router.post("/parse", readLimit, (req, res) => {
    const { query } = parseInput(parseSearchRequestSchema, req.body);
    // Validate our own output too, so a parser bug is a 500 here rather than a broken page.
    res.json(parsedSearchSchema.parse(parseSearch(query)));
  });

  return router;
}
