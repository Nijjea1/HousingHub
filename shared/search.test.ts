import { describe, expect, it } from "vitest";
import { DEFAULT_LISTING_FILTERS, DEFAULT_SEARCH_PARAMS, searchQuerySchema, type SearchParams } from "./schema";
import { haversineKm, searchFromQueryString, searchInMemory, searchToQuery } from "./search";
import { makeListing } from "./test-listing";

const MCMASTER = { latitude: 43.2609, longitude: -79.9192 };
// One degree of latitude on a sphere of radius 6371.0088 km.
const KM_PER_DEGREE = (2 * Math.PI * 6371.0088) / 360;

/** A listing `km` north of McMaster. */
const north = (km: number, overrides = {}) =>
  makeListing({ latitude: MCMASTER.latitude + km / KM_PER_DEGREE, longitude: MCMASTER.longitude, ...overrides });

const params = (overrides: Partial<SearchParams>): SearchParams => ({ ...DEFAULT_SEARCH_PARAMS, ...overrides });
const titles = (results: { listing: { title: string } }[]) => results.map((r) => r.listing.title);

describe("haversineKm", () => {
  it("is 0 for the same point and one degree of latitude is about 111.2 km", () => {
    expect(haversineKm(MCMASTER, MCMASTER)).toBe(0);
    const oneDegree = haversineKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(oneDegree).toBeCloseTo(KM_PER_DEGREE, 6);
  });

  it("is symmetric", () => {
    const toronto = { latitude: 43.6532, longitude: -79.3832 };
    expect(haversineKm(MCMASTER, toronto)).toBeCloseTo(haversineKm(toronto, MCMASTER), 9);
  });
});

describe("searchInMemory", () => {
  it("keeps listings inside the radius and drops ones outside or without coordinates", () => {
    const listings = [
      north(1, { title: "1 km" }),
      north(4, { title: "4 km" }),
      makeListing({ title: "no coordinates" }),
    ];
    const results = searchInMemory(listings, params({ center: MCMASTER, radiusKm: 2 }));
    expect(titles(results)).toEqual(["1 km"]);
    expect(results[0].distanceKm).toBeCloseTo(1, 6);
  });

  it("measures distance without a radius and sorts unmeasured listings last", () => {
    const listings = [makeListing({ title: "no coordinates" }), north(3, { title: "3 km" }), north(1, { title: "1 km" })];
    const results = searchInMemory(
      listings,
      params({ center: MCMASTER, filters: { ...DEFAULT_LISTING_FILTERS, sortBy: "distance" } }),
    );
    expect(titles(results)).toEqual(["1 km", "3 km", "no coordinates"]);
    expect(results[2].distanceKm).toBeNull();
  });

  it("leaves distance empty and ignores the radius without a center", () => {
    const results = searchInMemory([north(30, { title: "far" })], params({ radiusKm: 1 }));
    expect(titles(results)).toEqual(["far"]);
    expect(results[0].distanceKm).toBeNull();
  });

  it("sorts by distance as newest when there is no center", () => {
    const old = makeListing({ title: "old", createdAt: "2026-08-01T00:00:00Z" });
    const recent = makeListing({ title: "recent", createdAt: "2026-09-01T00:00:00Z" });
    const results = searchInMemory([old, recent], params({ filters: { ...DEFAULT_LISTING_FILTERS, sortBy: "distance" } }));
    expect(titles(results)).toEqual(["recent", "old"]);
  });

  it("applies the browse filters, hides unavailable listings and caps the result count", () => {
    const listings = [
      north(1, { title: "cheap", price: 600 }),
      north(1, { title: "pricey", price: 1500 }),
      north(1, { title: "hidden", price: 600, isAvailable: false }),
      north(1, { title: "cheap 2", price: 650 }),
    ];
    const results = searchInMemory(
      listings,
      params({ center: MCMASTER, radiusKm: 5, filters: { ...DEFAULT_LISTING_FILTERS, maxPrice: 1000, sortBy: "price-low" }, limit: 1 }),
    );
    expect(titles(results)).toEqual(["cheap"]);
  });
});

describe("searchQuerySchema and searchToQuery", () => {
  const parse = (query: string) => searchQuerySchema.safeParse(Object.fromEntries(new URLSearchParams(query)));

  it("reads an empty query as the default search", () => {
    expect(parse("")).toEqual({ success: true, data: DEFAULT_SEARCH_PARAMS });
  });

  it("reads a center, radius, limit and filters together", () => {
    const result = parse("lat=43.2609&lng=-79.9192&radiusKm=2&limit=50&maxPrice=900&sort=distance");
    expect(result.success && result.data).toEqual({
      center: MCMASTER,
      radiusKm: 2,
      limit: 50,
      filters: { ...DEFAULT_LISTING_FILTERS, maxPrice: 900, sortBy: "distance" },
    });
  });

  it("rejects half a center, a radius without a center, and out-of-range values", () => {
    const fieldsOf = (query: string) => {
      const result = parse(query);
      return result.success ? null : Object.keys(result.error.flatten().fieldErrors);
    };
    expect(fieldsOf("lat=43.26")).toEqual(["lng"]);
    expect(fieldsOf("radiusKm=2")).toEqual(["radiusKm"]);
    expect(fieldsOf("lat=91&lng=0")).toEqual(["lat"]);
    expect(fieldsOf("lat=43&lng=-79&radiusKm=500")).toEqual(["radiusKm"]);
    expect(fieldsOf("limit=0")).toEqual(["limit"]);
  });

  it("round-trips through the query string", () => {
    const original: SearchParams = {
      center: { latitude: 43.26, longitude: -79.92 },
      radiusKm: 1.5,
      limit: 100,
      filters: { ...DEFAULT_LISTING_FILTERS, minBedrooms: 2, propertyTypes: ["house"], sortBy: "distance" },
    };
    const result = parse(searchToQuery(original).toString());
    expect(result.success && result.data).toEqual(original);
  });

  it("leaves defaults out of the query string", () => {
    expect(searchToQuery(DEFAULT_SEARCH_PARAMS).toString()).toBe("");
  });
});

describe("searchFromQueryString", () => {
  it("reads a valid query and falls back to the default search for an invalid one", () => {
    expect(searchFromQueryString("?maxPrice=900").filters.maxPrice).toBe(900);
    expect(searchFromQueryString("maxPrice=cheap&lat=1")).toEqual(DEFAULT_SEARCH_PARAMS);
  });
});
