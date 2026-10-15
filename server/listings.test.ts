import { afterEach, describe, expect, it } from "vitest";
import type { Listing } from "@shared/schema";
import { TOKENS, startTestApi, validInput } from "./test-helpers";

let api: Awaited<ReturnType<typeof startTestApi>>;
afterEach(() => api?.close());

const landlord = TOKENS.landlord.token;
const other = TOKENS.other.token;

async function create(overrides = {}, token: string = landlord): Promise<Listing> {
  const res = await api.request("POST", "/api/listings", { token, body: validInput(overrides) });
  expect(res.status).toBe(201);
  return (await res.json()).listing;
}

describe("GET /api/listings", () => {
  it("returns available listings filtered and sorted by the query", async () => {
    api = await startTestApi();
    await create({ title: "Cheap house", price: 600 });
    await create({ title: "Pricey house", price: 1600 });
    await create({ title: "Hidden house", price: 700, isAvailable: false });

    const res = await api.request("GET", "/api/listings?maxPrice=1000&sort=price-low");
    expect(res.status).toBe(200);
    const { listings } = await res.json();
    expect(listings.map((l: Listing) => l.title)).toEqual(["Cheap house"]);
  });

  it("returns 400 with the field name for a bad filter", async () => {
    api = await startTestApi();
    const res = await api.request("GET", "/api/listings?minBedrooms=3%2B");
    expect(res.status).toBe(400);
    expect((await res.json()).fields.minBedrooms).toBeDefined();
  });

  it("returns only the caller's listings, including unavailable ones, for mine=true", async () => {
    api = await startTestApi();
    await create({ title: "Mine, hidden", isAvailable: false });
    await create({ title: "Someone else's" }, other);

    const res = await api.request("GET", "/api/listings?mine=true", { token: landlord });
    expect((await res.json()).listings.map((l: Listing) => l.title)).toEqual(["Mine, hidden"]);
    expect((await api.request("GET", "/api/listings?mine=true")).status).toBe(401);
  });
});

describe("GET /api/listings/:id", () => {
  it("returns one listing, 404 when missing, 400 for a malformed id", async () => {
    api = await startTestApi();
    const { id } = await create();
    expect((await (await api.request("GET", `/api/listings/${id}`)).json()).listing.id).toBe(id);
    expect((await api.request("GET", "/api/listings/7c9e6679-7425-40de-944b-e07fc1f90ae7")).status).toBe(404);
    expect((await api.request("GET", "/api/listings/not-a-uuid")).status).toBe(400);
  });
});

describe("POST /api/listings", () => {
  it("requires sign-in", async () => {
    api = await startTestApi();
    const res = await api.request("POST", "/api/listings", { body: validInput() });
    expect(res.status).toBe(401);
  });

  it("returns 400 with a message per invalid field", async () => {
    api = await startTestApi();
    const res = await api.request("POST", "/api/listings", {
      token: landlord,
      body: validInput({ title: "x", postalCode: "90210" }),
    });
    expect(res.status).toBe(400);
    const { fields } = await res.json();
    expect(fields.title).toEqual(["Title must be at least 5 characters"]);
    expect(fields.postalCode).toEqual(["Enter a valid postal code, e.g. L8S 1C7"]);
  });

  it("owns the listing as the caller and takes coordinates from the geocoder, not the body", async () => {
    api = await startTestApi();
    const listing = await create({ latitude: 0, longitude: 0 });
    expect(listing.userId).toBe(TOKENS.landlord.id);
    expect([listing.latitude, listing.longitude]).toEqual([43.26, -79.92]);
    expect(api.geocodeCalls).toEqual([
      { address: "Sterling St", city: "Hamilton", province: "ON" },
    ]);
  });

  it("still creates the listing when geocoding finds nothing", async () => {
    api = await startTestApi({ geocode: async () => null });
    const listing = await create();
    expect([listing.latitude, listing.longitude]).toEqual([null, null]);
  });

  it("rate limits writes per user", async () => {
    api = await startTestApi({ limits: { readsPerMinute: 100, writesPerMinute: 2 } });
    await create();
    await create();
    const res = await api.request("POST", "/api/listings", { token: landlord, body: validInput() });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).not.toBeNull();
    // A different user has their own allowance.
    await create({}, other);
  });
});

describe("PATCH /api/listings/:id", () => {
  it("applies a partial update and keeps the other fields", async () => {
    api = await startTestApi();
    const { id } = await create({ title: "Old title", price: 800 });
    const res = await api.request("PATCH", `/api/listings/${id}`, { token: landlord, body: { price: 850 } });
    expect(res.status).toBe(200);
    const { listing } = await res.json();
    expect([listing.title, listing.price]).toEqual(["Old title", 850]);
  });

  it("only re-geocodes when the address changes", async () => {
    api = await startTestApi();
    const { id } = await create();
    await api.request("PATCH", `/api/listings/${id}`, { token: landlord, body: { price: 900 } });
    expect(api.geocodeCalls).toHaveLength(1);
    await api.request("PATCH", `/api/listings/${id}`, { token: landlord, body: { address: "Emerson St" } });
    expect(api.geocodeCalls).toHaveLength(2);
  });

  it("returns 403 for someone else's listing and leaves it unchanged", async () => {
    api = await startTestApi();
    const { id } = await create({ price: 800 });
    const res = await api.request("PATCH", `/api/listings/${id}`, { token: other, body: { price: 1 } });
    expect(res.status).toBe(403);
    expect(api.listings.rows.get(id)?.price).toBe(800);
  });

  it("rejects a patch that would make the listing invalid", async () => {
    api = await startTestApi();
    const { id } = await create();
    const res = await api.request("PATCH", `/api/listings/${id}`, { token: landlord, body: { price: -5 } });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/listings/:id", () => {
  it("deletes the caller's own listing and refuses anyone else", async () => {
    api = await startTestApi();
    const { id } = await create();
    expect((await api.request("DELETE", `/api/listings/${id}`, { token: other })).status).toBe(403);
    expect((await api.request("DELETE", `/api/listings/${id}`, { token: landlord })).status).toBe(204);
    expect((await api.request("GET", `/api/listings/${id}`)).status).toBe(404);
  });
});
