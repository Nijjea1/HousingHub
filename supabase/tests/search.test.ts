import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { searchToArgs } from "@shared/mappers";
import { DEFAULT_LISTING_FILTERS, PROPERTY_TYPES, type Listing, type SearchParams, type SortOption } from "@shared/schema";
import { haversineKm, searchInMemory } from "@shared/search";
import { as, createDb, migrate } from "./db.mjs";
import { MCMASTER, insertListings, randomListings, rng } from "./random-listings.mjs";

let db: PGlite;
const listings: Listing[] = randomListings(400, { seed: 42 });

beforeAll(async () => {
  db = await createDb();
  await migrate(db);
  await insertListings(db, listings);
});
afterAll(() => db?.close());

/** Calls search_listings as anon with the same named arguments the API sends. */
async function searchSql(params: SearchParams) {
  const args = searchToArgs(params);
  const names = Object.keys(args);
  const sql = `select (listing).id as id, distance_m from public.search_listings(${names
    .map((n, i) => `${n} => $${i + 1}`)
    .join(", ")})`;
  const { rows } = await as(db, null, sql, Object.values(args));
  return rows as { id: string; distance_m: number | null }[];
}

function randomParams(r: () => number): SearchParams {
  const maybe = <T>(p: number, value: () => T): T | null => (r() < p ? value() : null);
  const sorts: SortOption[] = ["newest", "price-low", "price-high", "distance"];
  const center = maybe(0.8, () => ({
    latitude: MCMASTER.latitude + (r() - 0.5) * 0.1,
    longitude: MCMASTER.longitude + (r() - 0.5) * 0.1,
  }));
  return {
    center,
    radiusKm: center ? maybe(0.8, () => 0.5 + r() * 10) : null,
    limit: r() < 0.2 ? 5 : 500,
    filters: {
      ...DEFAULT_LISTING_FILTERS,
      minPrice: maybe(0.3, () => 400 + Math.floor(r() * 10) * 100),
      maxPrice: maybe(0.3, () => 900 + Math.floor(r() * 10) * 100),
      minBedrooms: maybe(0.3, () => Math.floor(r() * 4)),
      minBathrooms: maybe(0.2, () => [1, 1.5, 2][Math.floor(r() * 3)]),
      propertyTypes: PROPERTY_TYPES.filter(() => r() < 0.3),
      amenities: r() < 0.3 ? [["WIFI"], ["laundry", "Parking"], ["Gym"]][Math.floor(r() * 3)] : [],
      furnished: maybe(0.3, () => r() < 0.5),
      petsAllowed: maybe(0.3, () => r() < 0.5),
      sortBy: sorts[Math.floor(r() * sorts.length)],
    },
  };
}

/** True when a listing sits within 1 m of the radius edge, where float rounding could decide either way. */
function onTheEdge({ center, radiusKm }: SearchParams) {
  if (!center || radiusKm === null) return false;
  return listings.some(
    (l) =>
      l.latitude !== null &&
      l.longitude !== null &&
      Math.abs(haversineKm(center, { latitude: l.latitude, longitude: l.longitude }) - radiusKm) < 0.001,
  );
}

describe("search_listings", () => {
  it("fills location from latitude and longitude and indexes it", async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.listings where (location is null) <> (latitude is null)`,
    );
    expect(rows[0].n).toBe(0);
    const index = await db.query(`select 1 from pg_indexes where indexname = 'idx_listings_location'`);
    expect(index.rows).toHaveLength(1);
  });

  it("returns the same listings, in the same order, as the TypeScript reference for 200 random searches", async () => {
    const r = rng(7);
    let compared = 0;
    let nonEmpty = 0;
    for (let i = 0; i < 200; i++) {
      const params = randomParams(r);
      if (onTheEdge(params)) continue;
      const expected = searchInMemory(listings, params);
      const actual = await searchSql(params);
      expect(actual.map((row) => row.id), JSON.stringify(params)).toEqual(expected.map((e) => e.listing.id));
      actual.forEach((row, j) => {
        const km = expected[j].distanceKm;
        if (km === null) expect(row.distance_m).toBeNull();
        else expect(Math.abs(row.distance_m! / 1000 - km)).toBeLessThan(1e-6);
      });
      compared += 1;
      if (expected.length > 0) nonEmpty += 1;
    }
    // Guard against a generator that only produces trivial searches.
    expect(compared).toBeGreaterThan(190);
    expect(nonEmpty).toBeGreaterThan(100);
  });

  it("caps results at 500 even when asked for more", async () => {
    const rows = await searchSql({ center: null, radiusKm: null, filters: DEFAULT_LISTING_FILTERS, limit: 500 });
    const { rows: direct } = await as(db, null, `select count(*)::int as n from public.search_listings(max_results => 10000)`);
    expect(rows.length).toBeLessThanOrEqual(500);
    expect((direct[0] as { n: number }).n).toBeLessThanOrEqual(500);
  });
});
