/** Shared pieces for the routes that query through Drizzle. */
import type { AppDeps } from "../deps.js";
import { HttpError } from "../http.js";
import type { Db } from "./client.js";

export function dbOf(deps: Pick<AppDeps, "db">): Db {
  if (!deps.db) throw new HttpError(503, "The database connection is not configured (set DATABASE_URL)");
  return deps.db;
}

function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code ?? e?.cause?.code;
}

/** Turns Postgres errors that mean "the caller did something wrong" into HTTP errors. */
export async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    switch (pgCode(err)) {
      case "42501":
        throw new HttpError(403, "You can't do that");
      case "23505":
        throw new HttpError(409, "That already exists");
      case "23503":
        throw new HttpError(404, "Not found");
      case "23514":
      case "22P02":
        throw new HttpError(400, "Invalid input");
      default:
        throw err;
    }
  }
}
