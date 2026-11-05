/** Encoded polylines (precision 5), the format route lines travel in. */

export type LatLng = [latitude: number, longitude: number];

function encodeNumber(value: number): string {
  let v = Math.round(value * 1e5);
  v = v < 0 ? ~(v << 1) : v << 1;
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

export function encodePolyline(points: LatLng[]): string {
  let out = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const [lat, lng] of points) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    out += encodeNumber((latE5 - prevLat) / 1e5) + encodeNumber((lngE5 - prevLng) / 1e5);
    prevLat = latE5;
    prevLng = lngE5;
  }
  return out;
}

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) throw new Error("Truncated polyline");
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
