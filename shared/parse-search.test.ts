import { describe, expect, it } from "vitest";
import { parseSearch } from "./parse-search";
import { DEFAULT_LISTING_FILTERS, parsedSearchSchema } from "./schema";

const filtersOf = (query: string) => parseSearch(query).filters;

describe("parseSearch", () => {
  it("reads a typical sentence", () => {
    const result = parseSearch("2 bedroom house under $900 within 2 km of campus, furnished");
    expect(result.filters).toEqual({
      ...DEFAULT_LISTING_FILTERS,
      minBedrooms: 2,
      maxPrice: 900,
      propertyTypes: ["house"],
      furnished: true,
    });
    expect(result.radiusKm).toBe(2);
    expect(result.understood).toEqual(["Within 2 km of campus", "2+ bedrooms", "Under $900", "House", "Furnished"]);
  });

  it("finds nothing in unrelated text and returns the default filters", () => {
    expect(parseSearch("hello there")).toEqual({ filters: DEFAULT_LISTING_FILTERS, radiusKm: null, understood: [] });
  });

  describe("prices", () => {
    it.each([
      ["under $900", { maxPrice: 900 }],
      ["below 1,200", { maxPrice: 1200 }],
      ["max 1.2k", { maxPrice: 1200 }],
      ["budget of $850", { maxPrice: 850 }],
      ["at least $500", { minPrice: 500 }],
      ["over 600", { minPrice: 600 }],
      ["$700-$1000", { minPrice: 700, maxPrice: 1000 }],
      ["$700\u2013$1000 (en dash)", { minPrice: 700, maxPrice: 1000 }],
      ["between 1000 and 700", { minPrice: 700, maxPrice: 1000 }],
      ["800 to 1200 a month", { minPrice: 800, maxPrice: 1200 }],
      ["$950", { maxPrice: 950 }],
      ["900/month", { maxPrice: 900 }],
    ])("%s", (query, expected) => {
      expect(filtersOf(query)).toMatchObject({ minPrice: null, maxPrice: null, ...expected });
    });

    it("never reads small numbers as rent", () => {
      expect(filtersOf("under 5")).toMatchObject({ maxPrice: null });
      expect(filtersOf("2 to 3 bedrooms")).toMatchObject({ minPrice: null, maxPrice: null, minBedrooms: 3 });
    });
  });

  describe("rooms", () => {
    it.each([
      ["2 bed", 2],
      ["3+ bedrooms", 3],
      ["two bedroom apartment", 2],
      ["4br", 4],
      ["1-bedroom", 1],
    ])("%s has %i+ bedrooms", (query, n) => {
      expect(filtersOf(query).minBedrooms).toBe(n);
    });

    it("reads bathrooms and washrooms, rounded to halves", () => {
      expect(filtersOf("2 bathrooms").minBathrooms).toBe(2);
      expect(filtersOf("1.5 bath").minBathrooms).toBe(1.5);
      expect(filtersOf("two washrooms").minBathrooms).toBe(2);
    });

    it("doesn't confuse bedroom and price numbers", () => {
      expect(filtersOf("3 bedrooms under 2000")).toMatchObject({ minBedrooms: 3, maxPrice: 2000 });
    });
  });

  describe("distance", () => {
    it.each([
      ["within 3 km", 3],
      ["1.5km from mcmaster", 1.5],
      ["500 m from campus", 0.5],
      ["10 minute walk", 0.8],
      ["walking distance", 1.5],
      ["near campus", 2],
      ["close to McMaster", 2],
      ["within 200 km", 50],
    ])("%s is %f km", (query, km) => {
      expect(parseSearch(query).radiusKm).toBe(km);
    });

    it("leaves the radius empty when no distance is mentioned", () => {
      expect(parseSearch("2 bed house").radiusKm).toBeNull();
    });
  });

  describe("types, features and sort", () => {
    it("maps everyday words to property types", () => {
      expect(filtersOf("condo or townhouse").propertyTypes).toEqual(["apartment", "house"]);
      expect(filtersOf("bachelor").propertyTypes).toEqual(["studio"]);
      expect(filtersOf("residence room").propertyTypes).toEqual(["dormitory"]);
    });

    it("reads furnished and unfurnished", () => {
      expect(filtersOf("furnished").furnished).toBe(true);
      expect(filtersOf("unfurnished").furnished).toBe(false);
    });

    it("reads pets allowed, but treats 'no pets' as no preference", () => {
      expect(filtersOf("pet friendly").petsAllowed).toBe(true);
      expect(filtersOf("I have a dog").petsAllowed).toBe(true);
      expect(filtersOf("a place for me and my cat").petsAllowed).toBe(true);
      expect(filtersOf("bringing pets").petsAllowed).toBe(true);
      expect(filtersOf("no pets").petsAllowed).toBeNull();
    });

    it("maps amenity words to the app's amenity names", () => {
      expect(filtersOf("wifi, in-suite laundry, a/c and bike storage").amenities).toEqual([
        "Bike Storage",
        "WiFi",
        "Laundry",
        "Air Conditioning",
      ]);
      expect(filtersOf("bike parking").amenities).toEqual(["Bike Storage"]);
    });

    it("reads a sort order", () => {
      expect(filtersOf("cheapest studio").sortBy).toBe("price-low");
      expect(filtersOf("closest to campus").sortBy).toBe("distance");
    });
  });

  it("always returns a value the schema accepts", () => {
    for (const query of ["", "$", "under $0", "between 900 and", "999999 km", "3.7 bath", "ten bed under ten dollars"]) {
      expect(parsedSearchSchema.safeParse(parseSearch(query)).success, query).toBe(true);
    }
  });
});
