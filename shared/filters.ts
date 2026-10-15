import type { Listing, ListingFilters, SortOption } from "./schema.js";

const byKey = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
// Ties fall back to newest, then id, the same order search_listings uses in SQL.
const newest = (a: Listing, b: Listing) => byKey(b.createdAt, a.createdAt) || byKey(a.id, b.id);

const compare: Record<SortOption, (a: Listing, b: Listing) => number> = {
  newest,
  "price-low": (a, b) => a.price - b.price || newest(a, b),
  "price-high": (a, b) => b.price - a.price || newest(a, b),
  // Distance needs a center, so searchInMemory in shared/search.ts applies it on top.
  distance: newest,
};

/** Returns the listings that match every filter, sorted. Never mutates the input. */
export function applyFilters(listings: Listing[], filters: ListingFilters): Listing[] {
  const wantedAmenities = filters.amenities.map((a) => a.toLowerCase());

  return listings
    .filter((l) => {
      if (filters.minPrice !== null && l.price < filters.minPrice) return false;
      if (filters.maxPrice !== null && l.price > filters.maxPrice) return false;
      if (filters.minBedrooms !== null && l.bedrooms < filters.minBedrooms) return false;
      if (filters.minBathrooms !== null && l.bathrooms < filters.minBathrooms) return false;
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(l.propertyType)) return false;
      if (filters.furnished !== null && l.furnished !== filters.furnished) return false;
      if (filters.petsAllowed !== null && l.petsAllowed !== filters.petsAllowed) return false;
      if (wantedAmenities.length > 0) {
        const has = new Set(l.amenities.map((a) => a.toLowerCase()));
        if (!wantedAmenities.every((a) => has.has(a))) return false;
      }
      return true;
    })
    .sort(compare[filters.sortBy]);
}

/** Encodes filters as a query string, leaving out anything set to "any". Read back with listingFiltersQuerySchema. */
export function filtersToQuery(filters: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();
  const put = (key: string, value: string | number | boolean | null) => {
    if (value !== null) params.set(key, String(value));
  };
  put("minPrice", filters.minPrice);
  put("maxPrice", filters.maxPrice);
  put("minBedrooms", filters.minBedrooms);
  put("minBathrooms", filters.minBathrooms);
  if (filters.propertyTypes.length > 0) params.set("type", filters.propertyTypes.join(","));
  if (filters.amenities.length > 0) params.set("amenities", filters.amenities.join(","));
  put("furnished", filters.furnished);
  put("pets", filters.petsAllowed);
  if (filters.sortBy !== "newest") params.set("sort", filters.sortBy);
  return params;
}
