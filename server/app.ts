/** Builds the Express API. Shared by the dev server and the Vercel function. */
import express from "express";
import { authenticate } from "./auth.js";
import { conversationsRouter } from "./conversations.js";
import type { AppDeps } from "./deps.js";
import { HttpError, errorHandler } from "./http.js";
import { commuteRouter } from "./commute.js";
import { favoritesRouter } from "./favorites.js";
import { listingsRouter } from "./listings.js";
import { reviewsRouter } from "./reviews.js";
import { savedSearchesRouter } from "./saved-searches.js";
import { searchRouter } from "./search.js";
import { viewingsRouter } from "./viewings.js";

export function createApp(deps: AppDeps) {
  const app = express();
  app.disable("x-powered-by");
  // Vercel sits in front as a proxy; trust one hop so req.ip is the caller's address.
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", authenticate(deps));
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/listings", listingsRouter(deps));
  app.use("/api/search", searchRouter(deps));
  app.use("/api/conversations", conversationsRouter(deps));
  app.use("/api/favorites", favoritesRouter(deps));
  app.use("/api/saved-searches", savedSearchesRouter(deps));
  app.use("/api", viewingsRouter(deps));
  app.use("/api", reviewsRouter(deps));
  app.use("/api", commuteRouter(deps));

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));
  app.use(errorHandler);
  return app;
}
