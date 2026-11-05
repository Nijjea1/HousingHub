/** Types for db.mjs, so the TypeScript test files that import it type check. */
import type { PGlite, Results } from '@electric-sql/pglite';

export const repo: string;
/** [file name, SQL] for each migration, in order. */
export const migrations: Array<[string, string]>;
export const seedPath: string;
export const STUB: string;

export function createDb(): Promise<PGlite>;
export function migrate(db: PGlite): Promise<void>;
/** Runs a query as a signed-in user (uid) or as anon (null), the way PostgREST would. */
export function as<T = Record<string, unknown>>(db: PGlite, uid: string | null, sql: string, params?: unknown[]): Promise<Results<T>>;
export function fails(db: PGlite, uid: string | null, sql: string, params?: unknown[]): Promise<boolean>;
