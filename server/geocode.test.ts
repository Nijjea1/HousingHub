import { describe, expect, it, vi } from "vitest";
import { createNominatimGeocoder } from "./geocode";

const address = { address: "Sterling St", city: "Hamilton", province: "ON" as const };
const respond = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("createNominatimGeocoder", () => {
  it("sends a structured Canadian query with our User-Agent", async () => {
    const fetchFn = respond([{ lat: "43.2609", lon: "-79.9192" }]);
    await createNominatimGeocoder({ userAgent: "LetMeKnock test", fetchFn })(address);

    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const params = new URL(url).searchParams;
    expect(params.get("street")).toBe("Sterling St");
    expect(params.get("state")).toBe("Ontario");
    expect(params.get("countrycodes")).toBe("ca");
    // Nominatim has no Canadian postal codes; sending one returns no results.
    expect(params.get("postalcode")).toBeNull();
    expect(init.headers["User-Agent"]).toBe("LetMeKnock test");
  });

  it("returns the first result as numbers", async () => {
    const geocode = createNominatimGeocoder({ userAgent: "t", fetchFn: respond([{ lat: "43.2609", lon: "-79.9192" }]) });
    expect(await geocode(address)).toEqual({ latitude: 43.2609, longitude: -79.9192 });
  });

  it("returns null when nothing matches", async () => {
    const geocode = createNominatimGeocoder({ userAgent: "t", fetchFn: respond([]) });
    expect(await geocode(address)).toBeNull();
  });

  it("returns null instead of throwing when the provider errors or is unreachable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const down = createNominatimGeocoder({ userAgent: "t", fetchFn: respond({}, 503) });
    const offline = createNominatimGeocoder({
      userAgent: "t",
      fetchFn: (async () => {
        throw new TypeError("fetch failed");
      }) as typeof fetch,
    });
    expect(await down(address)).toBeNull();
    expect(await offline(address)).toBeNull();
    warn.mockRestore();
  });
});
