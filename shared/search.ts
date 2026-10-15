/** Radius search in plain TypeScript: the reference that search_listings in SQL is tested against. */
import { applyFilters, filtersToQuery } from "./filters.js";
import {
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_PARAMS,
  searchQuerySchema,
  type Coordinates,
  type Listing,
  type SearchParams,
  type SearchResult,
} from "./schema.js";

// The mean Earth radius PostGIS uses for sphere distances (use_spheroid = false).
const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in km. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const coordinatesOf = (l: Listing): Coordinates | null =>
  l.latitude !== null && l.longitude !== null ? { latitude: l.latitude, longitude: l.longitude } : null;

/** Available listings that match, nearest first when sorting by distance. Same rules as search_listings. */
export function searchInMemory(listings: Listing[], { center, radiusKm, filters, limit }: SearchParams): SearchResult[] {
  const results = applyFilters(
    listings.filter((l) => l.isAvailable),
    filters,
  )
    .map((listing) => {
      const point = coordinatesOf(listing);
      return { listing, distanceKm: center && point ? haversineKm(center, point) : null };
    })
    // A radius only applies with a center; listings without coordinates can't be inside one.
    .filter((r) => center === null || radiusKm === null || (r.distanceKm !== null && r.distanceKm <= radiusKm));

  if (filters.sortBy === "distance" && center) {
    // Array.prototype.sort is stable, so equal distances keep applyFilters' newest-first order.
    // Unmeasured listings go last, like "nulls last" in SQL. Infinity - Infinity is NaN, hence the equality check.
    const d = (r: SearchResult) => r.distanceKm ?? Infinity;
    results.sort((a, b) => (d(a) === d(b) ? 0 : d(a) - d(b)));
  }
  return results.slice(0, limit);
}

/** Encodes search params for the URL and /api/search. Read back with searchQuerySchema. */
export function searchToQuery({ center, radiusKm, filters, limit }: SearchParams): URLSearchParams {
  const params = filtersToQuery(filters);
  if (center) {
    // 5 decimals is about 1 m, plenty for a search center and keeps URLs short.
    params.set("lat", center.latitude.toFixed(5));
    params.set("lng", center.longitude.toFixed(5));
    if (radiusKm !== null) params.set("radiusKm", String(radiusKm));
  }
  if (limit !== DEFAULT_SEARCH_LIMIT) params.set("limit", String(limit));
  return params;
}

/** Reads a browse URL's query string. A hand-edited or stale URL falls back to the default search instead of an error. */
export function searchFromQueryString(queryString: string): SearchParams {
  const result = searchQuerySchema.safeParse(Object.fromEntries(new URLSearchParams(queryString)));
  return result.success ? result.data : DEFAULT_SEARCH_PARAMS;
}
