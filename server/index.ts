import { createServer } from "http";
import { createApp } from "./app.js";
import { createSupabaseDeps } from "./supabase-deps.js";
import { setupVite, serveStatic, log } from "./vite.js";

const app = createApp(createSupabaseDeps());

(async () => {
  const server = createServer(app);

  // Vite comes after the API so its catch-all route doesn't swallow /api requests.
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({ port, host: "localhost" }, () => {
    log(`serving on port ${port}`);
  });
})();
