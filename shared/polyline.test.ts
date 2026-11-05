import { describe, expect, it } from "vitest";
import { decodePolyline, encodePolyline, type LatLng } from "./polyline";

// The worked example from Google's polyline format documentation.
const POINTS: LatLng[] = [
  [38.5, -120.2],
  [40.7, -120.95],
  [43.252, -126.453],
];
const ENCODED = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

describe("polyline", () => {
  it("encodes the documented example", () => {
    expect(encodePolyline(POINTS)).toBe(ENCODED);
  });

  it("decodes the documented example", () => {
    expect(decodePolyline(ENCODED)).toEqual(POINTS);
  });

  it("round-trips a route near campus", () => {
    const route: LatLng[] = [
      [43.26091, -79.91924],
      [43.26123, -79.91411],
      [43.26201, -79.9106],
    ];
    expect(decodePolyline(encodePolyline(route))).toEqual(route);
  });

  it("handles empty input and rejects truncated input", () => {
    expect(encodePolyline([])).toBe("");
    expect(decodePolyline("")).toEqual([]);
    expect(() => decodePolyline("_p~iF~ps|")).toThrow("Truncated polyline");
  });
});
