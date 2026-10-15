/** Address to coordinates through OpenStreetMap's Nominatim. Data © OpenStreetMap contributors. */
import { PROVINCES, type Coordinates } from "../shared/schema.js";
import type { AddressQuery } from "./deps.js";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 4000;

export function createNominatimGeocoder({
  userAgent,
  fetchFn = fetch,
}: {
  userAgent: string;
  fetchFn?: typeof fetch;
}) {
  return async function geocode(a: AddressQuery): Promise<Coordinates | null> {
    // No postal code: OpenStreetMap has almost none for Canada, and including one makes Nominatim return nothing.
    const params = new URLSearchParams({
      street: a.address,
      city: a.city,
      state: PROVINCES[a.province] ?? a.province,
      countrycodes: "ca",
      format: "jsonv2",
      limit: "1",
    });
    try {
      const res = await fetchFn(`${ENDPOINT}?${params}`, {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const results = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (results.length === 0) return null;
      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    } catch (err) {
      // Saving the listing matters more than its coordinates; log and carry on.
      console.warn("Geocoding failed:", err instanceof Error ? err.message : err);
      return null;
    }
  };
}
