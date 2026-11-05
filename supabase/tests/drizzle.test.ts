import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { getTableColumns, getTableName, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { asUser, rowsOf, type Db } from "../../server/db/client";
import { allTables, savedSearches } from "../../server/db/schema";
import { createDb, migrate } from "./db.mjs";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";

let pg: PGlite;
let db: Db;

beforeAll(async () => {
  pg = await createDb();
  await migrate(pg);
  db = drizzle(pg) as unknown as Db;
  await pg.exec(`insert into auth.users (id, email) values ('${A}', 'a@test.dev'), ('${B}', 'b@test.dev')`);
});
afterAll(() => pg?.close());

describe("drizzle schema", () => {
  it("covers all 12 tables", () => {
    expect(Object.keys(allTables)).toHaveLength(12);
  });

  // listings.location is generated and never read or written by the API, so Drizzle doesn't model it.
  const unmodelled: Record<string, string[]> = { listings: ["location"] };

  it.each(Object.values(allTables).map((t) => [getTableName(t), t] as const))(
    "%s has the same columns as the migrations",
    async (name, table) => {
      const { rows } = await pg.query<{ column_name: string; is_nullable: string }>(
        `select column_name, is_nullable from information_schema.columns where table_schema = 'public' and table_name = $1`,
        [name],
      );
      const inDb = Object.fromEntries(rows.map((r) => [r.column_name, r.is_nullable === "NO"]));
      for (const skip of unmodelled[name] ?? []) delete inDb[skip];
      const inDrizzle = Object.fromEntries(Object.values(getTableColumns(table)).map((c) => [c.name, c.notNull]));
      expect(inDrizzle).toEqual(inDb);
    },
  );
});

describe("asUser", () => {
  it("lets a user write and read their own rows", async () => {
    await asUser(db, A, (tx) => tx.insert(savedSearches).values({ userId: A, name: "Near campus", params: { maxPrice: 1000 } }));
    const rows = await asUser(db, A, (tx) => tx.select().from(savedSearches));
    expect(rows).toHaveLength(1);
    expect(rows[0].params).toEqual({ maxPrice: 1000 });
  });

  it("applies row level security to other users and to signed-out visitors", async () => {
    expect(await asUser(db, B, (tx) => tx.select().from(savedSearches))).toHaveLength(0);
    expect(await asUser(db, null, (tx) => tx.select().from(savedSearches))).toHaveLength(0);
  });

  it("rejects writes on someone else's behalf", async () => {
    await expect(asUser(db, B, (tx) => tx.insert(savedSearches).values({ userId: A, name: "x" }))).rejects.toThrow();
  });

  it("does not leak the role into the next call", async () => {
    await asUser(db, A, async () => undefined);
    const [row] = rowsOf<{ u: string }>(await db.execute(sql`select current_user as u`));
    expect(row.u).not.toBe("authenticated");
  });
});
