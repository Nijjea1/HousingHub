import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes live under /api (added in milestone 2)
  const httpServer = createServer(app);

  return httpServer;
}
