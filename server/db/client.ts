/** Drizzle client, plus a helper that runs queries as the signed-in user so row level security still applies. */
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/** Any Drizzle Postgres database: postgres-js in production, PGlite in tests. */
export type Db = PgDatabase<PgQueryResultHKT>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function createDrizzle(databaseUrl: string): Db {
  // prepare: false because Supabase's pooler runs in transaction mode.
  return drizzle(postgres(databaseUrl, { prepare: false, max: 1 }));
}

/**
 * Runs fn in a transaction with the role and JWT subject Supabase's API would set,
 * so the policies see the caller. userId null means a signed-out visitor.
 * The connection's own role bypasses RLS, so queries that skip this are server-only.
 */
export function asUser<T>(db: Db, userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claim.sub', ${userId ?? ""}, true)`);
    await tx.execute(userId ? sql`set local role authenticated` : sql`set local role anon`);
    return fn(tx);
  });
}
