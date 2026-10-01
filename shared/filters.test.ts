import { describe, expect, it } from "vitest";
import { applyFilters } from "./filters";
import { DEFAULT_LISTING_FILTERS, type Listing, type ListingFilters } from "./schema";

let nextId = 0;
function listing(overrides: Partial<Listing>): Listing {
  nextId += 1;
  return {
    id: `00000000-0000-4000-8000-${String(nextId).padStart(12, "0")}`,
    userId: "0a000000-0000-4000-8000-000000000000",
    universityId: "mcmaster",
    title: `Listing ${nextId}`,
    description: "A place near campus.",
    detailedDescription: null,
    price: 800,
    propertyType: "house",
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: null,
    address: "1 Example St",
    neighborhood: null,
    city: "Hamilton",
    province: "ON",
    postalCode: "L8S 1C7",
    latitude: null,
    longitude: null,
    amenities: [],
    images: [],
    utilitiesIncluded: [],
    nearbyPlaces: [],
    isAvailable: true,
    availableFrom: null,
    leaseTerm: null,
    petsAllowed: false,
    furnished: false,
    distanceFromCampus: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

const filters = (overrides: Partial<ListingFilters>): ListingFilters => ({
  ...DEFAULT_LISTING_FILTERS,
  ...overrides,
});

const titles = (result: Listing[]) => result.map((l) => l.title);

describe("applyFilters", () => {
  it("returns every listing, newest first, with default filters", () => {
    const old = listing({ title: "old", createdAt: "2026-08-01T00:00:00Z" });
    const recent = listing({ title: "recent", createdAt: "2026-09-15T00:00:00Z" });
    const middle = listing({ title: "middle", createdAt: "2026-09-01T00:00:00Z" });
    expect(titles(applyFilters([old, recent, middle], DEFAULT_LISTING_FILTERS))).toEqual([
      "recent",
      "middle",
      "old",
    ]);
  });

  it("returns an empty array for no listings", () => {
    expect(applyFilters([], DEFAULT_LISTING_FILTERS)).toEqual([]);
  });

  it("does not change the array it was given", () => {
    const input = [
      listing({ price: 900, createdAt: "2026-08-01T00:00:00Z" }),
      listing({ price: 500, createdAt: "2026-09-01T00:00:00Z" }),
    ];
    const before = [...input];
    applyFilters(input, filters({ sortBy: "price-low", maxPrice: 600 }));
    expect(input).toEqual(before);
  });

  it("keeps prices inside the range, including both ends", () => {
    const input = [
      listing({ title: "500", price: 500 }),
      listing({ title: "700", price: 700 }),
      listing({ title: "900", price: 900 }),
      listing({ title: "1100", price: 1100 }),
    ];
    const result = applyFilters(input, filters({ minPrice: 700, maxPrice: 900 }));
    expect(titles(result).sort()).toEqual(["700", "900"]);
  });

  it("applies a max price on its own", () => {
    const input = [listing({ title: "cheap", price: 600 }), listing({ title: "pricey", price: 1500 })];
    expect(titles(applyFilters(input, filters({ maxPrice: 1000 })))).toEqual(["cheap"]);
  });

  it("treats 0 as a real limit, not as 'any'", () => {
    const input = [listing({ price: 600 })];
    expect(applyFilters(input, filters({ maxPrice: 0 }))).toEqual([]);
  });

  it("treats bedrooms as a minimum", () => {
    const input = [
      listing({ title: "one", bedrooms: 1 }),
      listing({ title: "two", bedrooms: 2 }),
      listing({ title: "five", bedrooms: 5 }),
    ];
    expect(titles(applyFilters(input, filters({ minBedrooms: 2 }))).sort()).toEqual(["five", "two"]);
  });

  it("keeps half bathrooms that meet the minimum", () => {
    const input = [
      listing({ title: "one", bathrooms: 1 }),
      listing({ title: "one and a half", bathrooms: 1.5 }),
      listing({ title: "two", bathrooms: 2 }),
    ];
    expect(titles(applyFilters(input, filters({ minBathrooms: 1.5 }))).sort()).toEqual([
      "one and a half",
      "two",
    ]);
  });

  it("keeps listings of any selected property type", () => {
    const input = [
      listing({ title: "house", propertyType: "house" }),
      listing({ title: "studio", propertyType: "studio" }),
      listing({ title: "apartment", propertyType: "apartment" }),
    ];
    const result = applyFilters(input, filters({ propertyTypes: ["house", "studio"] }));
    expect(titles(result).sort()).toEqual(["house", "studio"]);
  });

  it("requires every selected amenity, ignoring case", () => {
    const input = [
      listing({ title: "both", amenities: ["WiFi", "Laundry", "Gym"] }),
      listing({ title: "lowercase", amenities: ["wifi", "laundry"] }),
      listing({ title: "wifi only", amenities: ["WiFi"] }),
      listing({ title: "none", amenities: [] }),
    ];
    const result = applyFilters(input, filters({ amenities: ["WiFi", "Laundry"] }));
    expect(titles(result).sort()).toEqual(["both", "lowercase"]);
  });

  it("filters furnished both ways, and null means either", () => {
    const input = [
      listing({ title: "furnished", furnished: true }),
      listing({ title: "empty", furnished: false }),
    ];
    expect(titles(applyFilters(input, filters({ furnished: true })))).toEqual(["furnished"]);
    expect(titles(applyFilters(input, filters({ furnished: false })))).toEqual(["empty"]);
    expect(applyFilters(input, filters({ furnished: null }))).toHaveLength(2);
  });

  it("keeps only pet friendly listings when pets are required", () => {
    const input = [
      listing({ title: "pets ok", petsAllowed: true }),
      listing({ title: "no pets", petsAllowed: false }),
    ];
    expect(titles(applyFilters(input, filters({ petsAllowed: true })))).toEqual(["pets ok"]);
  });

  it("sorts by price in either direction", () => {
    const input = [
      listing({ title: "mid", price: 800 }),
      listing({ title: "low", price: 500 }),
      listing({ title: "high", price: 1200 }),
    ];
    expect(titles(applyFilters(input, filters({ sortBy: "price-low" })))).toEqual(["low", "mid", "high"]);
    expect(titles(applyFilters(input, filters({ sortBy: "price-high" })))).toEqual(["high", "mid", "low"]);
  });

  it("combines filters so a listing must pass all of them", () => {
    const input = [
      listing({ title: "match", price: 700, bedrooms: 3, furnished: true, amenities: ["WiFi"] }),
      listing({ title: "too pricey", price: 1300, bedrooms: 3, furnished: true, amenities: ["WiFi"] }),
      listing({ title: "too small", price: 700, bedrooms: 1, furnished: true, amenities: ["WiFi"] }),
      listing({ title: "no wifi", price: 700, bedrooms: 3, furnished: true, amenities: [] }),
    ];
    const result = applyFilters(
      input,
      filters({ maxPrice: 1000, minBedrooms: 2, furnished: true, amenities: ["WiFi"] }),
    );
    expect(titles(result)).toEqual(["match"]);
  });
});
