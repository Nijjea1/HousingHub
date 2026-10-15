import { afterEach, describe, expect, it } from "vitest";
import type { SearchResult } from "@shared/schema";
import { TOKENS, startTestApi, validInput } from "./test-helpers";

let api: Awaited<ReturnType<typeof startTestApi>>;
afterEach(() => api?.close());

const MCMASTER = { lat: 43.2609, lng: -79.9192 };
// Roughly 1 km and 5 km north of McMaster.
const NEAR = { latitude: 43.2699, longitude: -79.9192 };
const FAR = { latitude: 43.3059, longitude: -79.9192 };

/** Creates a listing and pins it to a point, since the fake geocoder always returns the same one. */
async function createAt(point: { latitude: number; longitude: number }, overrides = {}) {
  const res = await api.request("POST", "/api/listings", { token: TOKENS.landlord.token, body: validInput(overrides) });
  const { listing } = await res.json();
  api.listings.rows.set(listing.id, { ...listing, ...point });
  return listing;
}

const titles = (results: SearchResult[]) => results.map((r) => r.listing.title);

describe("GET /api/search", () => {
  it("returns listings within the radius with their distance, nearest first", async () => {
    api = await startTestApi();
    await createAt(FAR, { title: "Far house" });
    await createAt(NEAR, { title: "Near house" });

    const res = await api.request("GET", `/api/search?lat=${MCMASTER.lat}&lng=${MCMASTER.lng}&radiusKm=10&sort=distance`);
    expect(res.status).toBe(200);
    const { results } = await res.json();
    expect(titles(results)).toEqual(["Near house", "Far house"]);
    expect(results[0].distanceKm).toBeCloseTo(1, 1);

    const tight = await (await api.request("GET", `/api/search?lat=${MCMASTER.lat}&lng=${MCMASTER.lng}&radiusKm=2`)).json();
    expect(titles(tight.results)).toEqual(["Near house"]);
  });

  it("combines the radius with the browse filters", async () => {
    api = await startTestApi();
    await createAt(NEAR, { title: "Cheap", price: 600 });
    await createAt(NEAR, { title: "Pricey", price: 1600 });
    const res = await api.request("GET", `/api/search?lat=${MCMASTER.lat}&lng=${MCMASTER.lng}&radiusKm=2&maxPrice=1000`);
    expect(titles((await res.json()).results)).toEqual(["Cheap"]);
  });

  it("works without a location and leaves distances empty", async () => {
    api = await startTestApi();
    await createAt(FAR, { title: "Far house" });
    const { results } = await (await api.request("GET", "/api/search")).json();
    expect(titles(results)).toEqual(["Far house"]);
    expect(results[0].distanceKm).toBeNull();
  });

  it("returns 400 with field messages for a bad location", async () => {
    api = await startTestApi();
    const halfCenter = await api.request("GET", "/api/search?lat=43.26");
    expect(halfCenter.status).toBe(400);
    expect((await halfCenter.json()).fields.lng).toEqual(["Send lat and lng together"]);

    const tooWide = await api.request("GET", `/api/search?lat=${MCMASTER.lat}&lng=${MCMASTER.lng}&radiusKm=500`);
    expect(tooWide.status).toBe(400);
    expect((await tooWide.json()).fields.radiusKm).toBeDefined();
  });

  it("is rate limited", async () => {
    api = await startTestApi({ limits: { readsPerMinute: 1, writesPerMinute: 1 } });
    expect((await api.request("GET", "/api/search")).status).toBe(200);
    expect((await api.request("GET", "/api/search")).status).toBe(429);
  });
});

describe("POST /api/search/parse", () => {
  it("turns a sentence into filters and a radius", async () => {
    api = await startTestApi();
    const res = await api.request("POST", "/api/search/parse", { body: { query: "2 bed house under $900 near campus" } });
    expect(res.status).toBe(200);
    const parsed = await res.json();
    expect(parsed.filters).toMatchObject({ minBedrooms: 2, maxPrice: 900, propertyTypes: ["house"] });
    expect(parsed.radiusKm).toBe(2);
    expect(parsed.understood).toContain("2+ bedrooms");
  });

  it("returns 400 for an empty or overly long description", async () => {
    api = await startTestApi();
    const empty = await api.request("POST", "/api/search/parse", { body: { query: "  " } });
    expect(empty.status).toBe(400);
    expect((await empty.json()).fields.query).toEqual(["Describe the place you're looking for"]);
    expect((await api.request("POST", "/api/search/parse", { body: { query: "x".repeat(301) } })).status).toBe(400);
    expect((await api.request("POST", "/api/search/parse", { body: {} })).status).toBe(400);
  });
});
