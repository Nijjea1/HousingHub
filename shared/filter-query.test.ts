import { describe, expect, it } from "vitest";
import { filtersToQuery } from "./filters";
import { DEFAULT_LISTING_FILTERS, listingFiltersQuerySchema, type ListingFilters } from "./schema";

const parse = (query: string) => listingFiltersQuerySchema.safeParse(Object.fromEntries(new URLSearchParams(query)));

describe("listingFiltersQuerySchema", () => {
  it("reads an empty query as the default filters", () => {
    expect(parse("")).toEqual({ success: true, data: DEFAULT_LISTING_FILTERS });
  });

  it("converts strings into numbers, lists and booleans", () => {
    const result = parse("minPrice=500&minBathrooms=1.5&type=house,studio&amenities=WiFi,Air%20Conditioning&furnished=false&pets=true&sort=price-low");
    expect(result.success && result.data).toEqual({
      ...DEFAULT_LISTING_FILTERS,
      minPrice: 500,
      minBathrooms: 1.5,
      propertyTypes: ["house", "studio"],
      amenities: ["WiFi", "Air Conditioning"],
      furnished: false,
      petsAllowed: true,
      sortBy: "price-low",
    });
  });

  it("rejects values that are not numbers instead of ignoring them", () => {
    expect(parse("minBedrooms=3%2B").success).toBe(false);
    expect(parse("minPrice=cheap").success).toBe(false);
  });

  it("rejects unknown property types, sorts and booleans", () => {
    expect(parse("type=castle").success).toBe(false);
    expect(parse("sort=closest").success).toBe(false);
    expect(parse("pets=yes").success).toBe(false);
  });
});

describe("filtersToQuery", () => {
  it("leaves out filters set to any", () => {
    expect(filtersToQuery(DEFAULT_LISTING_FILTERS).toString()).toBe("");
  });

  it("round-trips through the query schema", () => {
    const filters: ListingFilters = {
      minPrice: 600,
      maxPrice: 1500,
      minBedrooms: 2,
      minBathrooms: 1.5,
      propertyTypes: ["apartment"],
      amenities: ["WiFi", "Bike Storage"],
      furnished: true,
      petsAllowed: null,
      sortBy: "price-high",
    };
    expect(parse(filtersToQuery(filters).toString())).toEqual({ success: true, data: filters });
  });
});

describe("query error messages", () => {
  it("says a number is expected in plain words", () => {
    const result = listingFiltersQuerySchema.safeParse({ minPrice: "cheap" });
    expect(!result.success && result.error.flatten().fieldErrors.minPrice).toEqual(["Must be a number"]);
  });
});
