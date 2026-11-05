import { describe, expect, it, vi } from "vitest";
import { decodePolyline } from "@shared/polyline";
import { createRoutePlanner, nextWeekdayMorning } from "./routing";

const FROM = { latitude: 43.262, longitude: -79.9106 };
const TO = { latitude: 43.2609, longitude: -79.9192 };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("nextWeekdayMorning", () => {
  it("skips the weekend", () => {
    // Friday 2026-11-06 noon UTC -> Monday 2026-11-09
    expect(nextWeekdayMorning(Date.UTC(2026, 10, 6, 12))).toBe("2026-11-09T13:30:00.000Z");
    // Tuesday 2026-11-03 -> Wednesday
    expect(nextWeekdayMorning(Date.UTC(2026, 10, 3, 12))).toBe("2026-11-04T13:30:00.000Z");
  });
});

describe("OpenRouteService", () => {
  const orsResponse = { routes: [{ summary: { distance: 1105.4, duration: 868 }, geometry: "_p~iF~ps|U_ulLnnqC" }] };

  it("asks for the right profile with longitude first and the key as the Authorization header", async () => {
    const fetchFn = vi.fn(async () => json(orsResponse));
    const planner = createRoutePlanner({ openRouteServiceKey: "key-123", fetchFn: fetchFn as unknown as typeof fetch });

    const result = await planner.route("walk", FROM, TO);
    expect(result).toEqual({ minutes: 14.5, distanceM: 1105, geometry: "_p~iF~ps|U_ulLnnqC" });

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openrouteservice.org/v2/directions/foot-walking");
    expect((init.headers as Record<string, string>).Authorization).toBe("key-123");
    expect(JSON.parse(init.body as string)).toEqual({ coordinates: [[-79.9106, 43.262], [-79.9192, 43.2609]] });
  });

  it("uses a profile per mode", async () => {
    const fetchFn = vi.fn(async () => json(orsResponse));
    const planner = createRoutePlanner({ openRouteServiceKey: "k", fetchFn: fetchFn as unknown as typeof fetch });
    await planner.route("bike", FROM, TO);
    await planner.route("drive", FROM, TO);
    expect(fetchFn.mock.calls.map((c) => (c as unknown as [string])[0].split("/").pop())).toEqual(["cycling-regular", "driving-car"]);
  });

  it("returns null when there is no route and throws when the provider fails", async () => {
    const none = createRoutePlanner({ openRouteServiceKey: "k", fetchFn: (async () => json({ routes: [] })) as unknown as typeof fetch });
    expect(await none.route("walk", FROM, TO)).toBeNull();
    const down = createRoutePlanner({ openRouteServiceKey: "k", fetchFn: (async () => json({}, 503)) as unknown as typeof fetch });
    await expect(down.route("walk", FROM, TO)).rejects.toThrow("OpenRouteService answered 503");
  });
});

describe("TravelTime", () => {
  const response = {
    results: [
      {
        locations: [
          {
            properties: [
              {
                travel_time: 1320,
                distance: 4210,
                route: { parts: [{ coords: [{ lat: 43.262, lng: -79.9106 }, { lat: 43.2615, lng: -79.915 }] }, { coords: [{ lat: 43.2609, lng: -79.9192 }] }] },
              },
            ],
          },
        ],
      },
    ],
  };

  it("prices transit for a weekday morning and encodes the route", async () => {
    const fetchFn = vi.fn(async () => json(response));
    const planner = createRoutePlanner({
      travelTime: { appId: "app", apiKey: "secret" },
      fetchFn: fetchFn as unknown as typeof fetch,
      now: () => Date.UTC(2026, 10, 6, 12),
    });

    const result = await planner.route("transit", FROM, TO);
    expect(result).toMatchObject({ minutes: 22, distanceM: 4210 });
    expect(decodePolyline(result!.geometry!)).toEqual([[43.262, -79.9106], [43.2615, -79.915], [43.2609, -79.9192]]);

    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ "X-Application-Id": "app", "X-Api-Key": "secret" });
    const body = JSON.parse(init.body as string);
    expect(body.departure_searches[0]).toMatchObject({ departure_time: "2026-11-09T13:30:00.000Z", transportation: { type: "public_transport" } });
  });

  it("returns null when TravelTime finds no route", async () => {
    const planner = createRoutePlanner({ travelTime: { appId: "a", apiKey: "b" }, fetchFn: (async () => json({ results: [{ locations: [] }] })) as unknown as typeof fetch });
    expect(await planner.route("transit", FROM, TO)).toBeNull();
  });
});

describe("configuration", () => {
  it("only supports the modes it has keys for and never calls out for the rest", async () => {
    const fetchFn = vi.fn();
    const planner = createRoutePlanner({ openRouteServiceKey: "k", fetchFn: fetchFn as unknown as typeof fetch });
    expect(planner.supports("walk")).toBe(true);
    expect(planner.supports("transit")).toBe(false);
    expect(await planner.route("transit", FROM, TO)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
