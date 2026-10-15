import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { TILE_ATTRIBUTION, TILE_URL, campusIcon, priceIcon } from '@/lib/map-icons';
import type { Coordinates, University } from '@shared/schema';

interface MiniMapProps {
  place: Coordinates;
  price: number;
  campus: University | null;
}

/** One listing and its campus, framed so both are in view. Loaded on its own so Leaflet never delays the page. */
const MiniMap = ({ place, price, campus }: MiniMapProps) => {
  const points: L.LatLngTuple[] = [[place.latitude, place.longitude]];
  if (campus) points.push([campus.latitude, campus.longitude]);

  return (
    <MapContainer
      bounds={L.latLngBounds(points)}
      boundsOptions={{ padding: [48, 48], maxZoom: 16 }}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <Marker position={points[0]} icon={priceIcon(price, true)} />
      {campus && <Marker position={points[1]} icon={campusIcon} title={campus.name} />}
    </MapContainer>
  );
};

export default MiniMap;
