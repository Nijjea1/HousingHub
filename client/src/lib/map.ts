/** Small helpers for the map and distance displays. */
import { haversineKm } from '@shared/search';
import { MAX_SEARCH_RADIUS_KM, type Coordinates, type SearchParams, type University } from '@shared/schema';

export const DISTANCE_CHOICES_KM = [1, 2, 5, 10] as const;
export const MCMASTER_ID = 'mcmaster';
/** Where the map opens if universities haven't loaded: McMaster, matching the universities migration. */
export const FALLBACK_CENTER: Coordinates = { latitude: 43.2609, longitude: -79.9192 };

/** "650 m" under a kilometre, "1.2 km" above. */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Radius that covers the visible map: center to corner, rounded up to 0.1 km and capped at the API limit. */
export function radiusForView(center: Coordinates, corner: Coordinates): number {
  const km = Math.ceil(haversineKm(center, corner) * 10) / 10;
  return Math.min(MAX_SEARCH_RADIUS_KM, Math.max(0.1, km));
}

/** The campus to measure from: the user's own university, else McMaster, else the first active one. */
export function pickCampus(universities: University[], preferredId: string | null | undefined): University | null {
  return (
    universities.find((u) => u.id === preferredId) ??
    universities.find((u) => u.id === MCMASTER_ID) ??
    universities[0] ??
    null
  );
}

const coordinatesOf = (u: University): Coordinates => ({ latitude: u.latitude, longitude: u.longitude });

/** True when two points are within about 10 m, e.g. a URL center that was set from the campus. */
export function samePlace(a: Coordinates, b: Coordinates): boolean {
  return Math.abs(a.latitude - b.latitude) < 1e-4 && Math.abs(a.longitude - b.longitude) < 1e-4;
}

/** Measures from campus when the URL has no center, so distances and "nearest first" always work. */
export function withCampusCenter(params: SearchParams, campus: University | null): SearchParams {
  return params.center || !campus ? params : { ...params, center: coordinatesOf(campus) };
}

/** Where distances are measured from, for labels like "1.2 km from McMaster". */
export function distanceOrigin(params: SearchParams, campus: University | null): string {
  if (campus && (!params.center || samePlace(params.center, coordinatesOf(campus)))) return campus.shortName;
  return 'the map center';
}
