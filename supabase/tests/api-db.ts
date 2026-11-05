/** Starts the API against a real migrated PGlite database, with fake sign-in, for the Drizzle routes. */
import type { AddressInfo } from "node:net";
import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createApp } from "../../server/app";
import type { Db } from "../../server/db/client";
import type { AppDeps } from "../../server/deps";
import { createDb, migrate } from "./db.mjs";

export const USERS = {
  landlord: { token: "token-landlord", id: "0a000000-0000-4000-8000-00000000000a", name: "Lena Landlord" },
  student: { token: "token-student", id: "0c000000-0000-4000-8000-00000000000c", name: "Sam Student" },
  other: { token: "token-other", id: "0b000000-0000-4000-8000-00000000000b", name: "Olive Other" },
} as const;

export const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);

export async function startDbApi(overrides: Partial<AppDeps> = {}) {
  const pg: PGlite = await createDb();
  await migrate(pg);
  for (const u of Object.values(USERS)) {
    await pg.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      u.id,
      `${u.token}@test.dev`,
      JSON.stringify({ full_name: u.name }),
    ]);
  }
  const listing = await pg.query<{ id: string }>(
    `insert into public.listings (title, description, price, property_type, bedrooms, bathrooms, address, city, province, postal_code, university_id, user_id, latitude, longitude)
     values ('Room near campus', 'A bright room', 800, 'house', 3, 1, 'Sterling St', 'Hamilton', 'ON', 'L8S 4H9', 'mcmaster', $1, 43.262, -79.9106) returning id`,
    [USERS.landlord.id],
  );
  const listingId = listing.rows[0].id;

  const deps: AppDeps = {
    verifyToken: async (token) => {
      const u = Object.values(USERS).find((x) => x.token === token);
      return u ? { id: u.id } : null;
    },
    listingsFor: () => {
      throw new Error("not used");
    },
    messagesFor: () => {
      throw new Error("not used");
    },
    geocode: async () => null,
    db: drizzle(pg) as unknown as Db,
    now: () => NOW,
    limits: { readsPerMinute: 10_000, writesPerMinute: 10_000 },
    ...overrides,
  };
  const server = createApp(deps).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  const request = async (method: string, path: string, options: { token?: string; body?: unknown } = {}) => {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  return {
    pg,
    listingId,
    request,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await pg.close();
    },
  };
}
