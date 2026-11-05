import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import { TILE_ATTRIBUTION, TILE_URL, campusIcon, priceIcon } from '@/lib/map-icons';
import type { Coordinates, University } from '@shared/schema';

interface MiniMapProps {
  place: Coordinates;
  price: number;
  campus: University | null;
  /** The commute route to draw, as latitude and longitude pairs. */
  route?: L.LatLngTuple[];
}

/** One listing and its campus, framed so both are in view. Loaded on its own so Leaflet never delays the page. */
const MiniMap = ({ place, price, campus, route }: MiniMapProps) => {
  const points: L.LatLngTuple[] = [[place.latitude, place.longitude]];
  if (campus) points.push([campus.latitude, campus.longitude]);
  // Frame the whole route, not just the two ends, so a long way round stays in view.
  const framed = route && route.length > 1 ? [...points, ...route] : points;

  return (
    // key: bounds only apply when the map is created, so a new route needs a fresh map.
    <MapContainer
      key={route ? `route-${route.length}-${route[0]}` : 'plain'}
      bounds={L.latLngBounds(framed)}
      boundsOptions={{ padding: [48, 48], maxZoom: 16 }}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      {route && route.length > 1 && <Polyline positions={route} pathOptions={{ weight: 5, opacity: 0.85 }} />}
      <Marker position={points[0]} icon={priceIcon(price, true)} />
      {campus && <Marker position={points[1]} icon={campusIcon} title={campus.name} />}
    </MapContainer>
  );
};

export default MiniMap;
