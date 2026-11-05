/** Commute times and route lines: OpenRouteService for walk, bike and drive, TravelTime for transit. */
import { encodePolyline, type LatLng } from "../shared/polyline.js";
import type { CommuteMode, Coordinates } from "../shared/schema.js";
import type { RoutePlanner } from "./deps.js";

const ORS_BASE = "https://api.openrouteservice.org/v2/directions";
const TRAVELTIME_URL = "https://api.traveltimeapp.com/v4/routes";
const TIMEOUT_MS = 6000;

const ORS_PROFILES = {
  walk: "foot-walking",
  bike: "cycling-regular",
  drive: "driving-car",
} as const;

/** The next weekday at 8:30 Eastern (13:30 UTC, ignoring daylight saving), so transit is priced at a school-day morning. */
export function nextWeekdayMorning(nowMs: number): string {
  const d = new Date(nowMs);
  d.setUTCHours(13, 30, 0, 0);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString();
}

interface Options {
  openRouteServiceKey?: string;
  travelTime?: { appId: string; apiKey: string };
  fetchFn?: typeof fetch;
  now?: () => number;
}

export function createRoutePlanner({ openRouteServiceKey, travelTime, fetchFn = fetch, now = Date.now }: Options): RoutePlanner {
  const supported = new Set<CommuteMode>();
  if (openRouteServiceKey) for (const mode of ["walk", "bike", "drive"] as const) supported.add(mode);
  if (travelTime) supported.add("transit");

  async function viaOpenRouteService(mode: keyof typeof ORS_PROFILES, from: Coordinates, to: Coordinates) {
    const res = await fetchFn(`${ORS_BASE}/${ORS_PROFILES[mode]}`, {
      method: "POST",
      headers: { Authorization: openRouteServiceKey!, "Content-Type": "application/json" },
      // ORS wants longitude first.
      body: JSON.stringify({ coordinates: [[from.longitude, from.latitude], [to.longitude, to.latitude]] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`OpenRouteService answered ${res.status}`);
    const data = (await res.json()) as { routes?: Array<{ summary: { distance: number; duration: number }; geometry?: string }> };
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      minutes: Math.round((route.summary.duration / 60) * 10) / 10,
      distanceM: Math.round(route.summary.distance),
      geometry: route.geometry ?? null,
    };
  }

  async function viaTravelTime(from: Coordinates, to: Coordinates) {
    const res = await fetchFn(TRAVELTIME_URL, {
      method: "POST",
      headers: { "X-Application-Id": travelTime!.appId, "X-Api-Key": travelTime!.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [
          { id: "from", coords: { lat: from.latitude, lng: from.longitude } },
          { id: "to", coords: { lat: to.latitude, lng: to.longitude } },
        ],
        departure_searches: [
          {
            id: "commute",
            departure_location_id: "from",
            arrival_location_ids: ["to"],
            transportation: { type: "public_transport" },
            departure_time: nextWeekdayMorning(now()),
            properties: ["travel_time", "distance", "route"],
          },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`TravelTime answered ${res.status}`);
    const data = (await res.json()) as {
      results?: Array<{
        locations?: Array<{
          properties?: Array<{
            travel_time: number;
            distance?: number;
            route?: { parts?: Array<{ coords?: Array<{ lat: number; lng: number }> }> };
          }>;
        }>;
      }>;
    };
    const found = data.results?.[0]?.locations?.[0]?.properties?.[0];
    if (!found) return null;
    const points: LatLng[] = (found.route?.parts ?? []).flatMap((p) => (p.coords ?? []).map((c): LatLng => [c.lat, c.lng]));
    return {
      minutes: Math.round((found.travel_time / 60) * 10) / 10,
      distanceM: found.distance === undefined ? null : Math.round(found.distance),
      geometry: points.length > 1 ? encodePolyline(points) : null,
    };
  }

  return {
    supports: (mode) => supported.has(mode),
    async route(mode, from, to) {
      if (!supported.has(mode)) return null;
      return mode === "transit" ? viaTravelTime(from, to) : viaOpenRouteService(mode, from, to);
    },
  };
}

/** Planner from environment variables; undefined when no provider is configured. */
export function createRoutePlannerFromEnv(env: NodeJS.ProcessEnv): RoutePlanner | undefined {
  const openRouteServiceKey = env.ORS_API_KEY || undefined;
  const travelTime = env.TRAVELTIME_APP_ID && env.TRAVELTIME_API_KEY ? { appId: env.TRAVELTIME_APP_ID, apiKey: env.TRAVELTIME_API_KEY } : undefined;
  if (!openRouteServiceKey && !travelTime) {
    console.warn("Commute times are off: set ORS_API_KEY (walk, bike, drive) and TRAVELTIME_APP_ID with TRAVELTIME_API_KEY (transit).");
    return undefined;
  }
  return createRoutePlanner({ openRouteServiceKey, travelTime });
}
