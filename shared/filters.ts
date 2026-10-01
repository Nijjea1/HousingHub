import type { Listing, ListingFilters, SortOption } from "./schema";

const compare: Record<SortOption, (a: Listing, b: Listing) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  "price-low": (a, b) => a.price - b.price,
  "price-high": (a, b) => b.price - a.price,
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
