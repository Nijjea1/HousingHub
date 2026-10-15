import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import DescribeSearch from '@/components/listings/DescribeSearch';
import { listingFacts } from '@/components/listings/ListingCard';
import ListingCover from '@/components/listings/ListingCover';
import SearchChips from '@/components/listings/SearchChips';
import SearchToolbar from '@/components/listings/SearchToolbar';
import { Button } from '@/components/ui/button';
import { useCampus } from '@/hooks/use-campus';
import { useSearchResults } from '@/hooks/use-listings';
import { useSearchUrl } from '@/hooks/use-search-url';
import { FALLBACK_CENTER, distanceOrigin, formatDistance, radiusForView, withCampusCenter } from '@/lib/map';
import { TILE_ATTRIBUTION, TILE_URL, campusIcon, priceIcon } from '@/lib/map-icons';
import type { Coordinates, SearchParams, SearchResult } from '@shared/schema';

const DEFAULT_ZOOM = 14;

/** Listing markers in a cluster layer. Leaflet owns these DOM nodes, so they're managed imperatively. */
function ClusteredMarkers({
  results,
  selectedId,
  onSelect,
}: {
  results: SearchResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const group = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, { marker: L.Marker; price: number }>());
  const selected = useRef(selectedId);

  useEffect(() => {
    const layer = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 });
    group.current = layer;
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map]);

  // Rebuild only when the results change; selecting a listing just swaps two icons (below).
  useEffect(() => {
    const layer = group.current;
    if (!layer) return;
    layer.clearLayers();
    markers.current.clear();
    const fresh: L.Marker[] = [];
    for (const { listing } of results) {
      if (listing.latitude === null || listing.longitude === null) continue;
      const marker = L.marker([listing.latitude, listing.longitude], {
        icon: priceIcon(listing.price, listing.id === selected.current),
        title: listing.title,
        keyboard: true,
      });
      marker.on('click', () => onSelect(listing.id));
      markers.current.set(listing.id, { marker, price: listing.price });
      fresh.push(marker);
    }
    // One bulk add lets the cluster plugin compute clusters once instead of per marker.
    layer.addLayers(fresh);
  }, [results, onSelect]);

  useEffect(() => {
    const restyle = (id: string | null, isSelected: boolean) => {
      const entry = id ? markers.current.get(id) : undefined;
      entry?.marker.setIcon(priceIcon(entry.price, isSelected));
    };
    restyle(selected.current, false);
    restyle(selectedId, true);
    selected.current = selectedId;
  }, [selectedId]);

  return null;
}

/**
 * Keeps the map in step with the URL: fits the search circle when the search changes from outside
 * (the distance menu), and offers "search this area" after the user pans or zooms.
 */
function SearchArea({ params, onSearchArea }: { params: SearchParams; onSearchArea: (center: Coordinates, radiusKm: number) => void }) {
  const map = useMap();
  const [moved, setMoved] = useState(false);
  // The view the search last put the map in. The button shows once the user leaves it.
  // Comparing views (not flagging our own moves) can't get stuck when a refit doesn't move the map.
  const settled = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  // A search started from the map already matches the view; refitting to the circle would zoom out each time.
  const fromMap = useRef(false);

  const remember = () => {
    const c = map.getCenter();
    settled.current = { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
    setMoved(false);
  };

  useEffect(() => {
    if (fromMap.current) {
      fromMap.current = false;
      remember();
      return;
    }
    if (params.center) {
      const center = L.latLng(params.center.latitude, params.center.longitude);
      // No animation, so the new view is in place before we remember it.
      if (params.radiusKm !== null) map.fitBounds(center.toBounds(params.radiusKm * 2000), { padding: [16, 16], animate: false });
      else map.setView(center, map.getZoom(), { animate: false });
    }
    remember();
  }, [map, params.center?.latitude, params.center?.longitude, params.radiusKm]);

  useMapEvents({
    moveend() {
      const s = settled.current;
      const c = map.getCenter();
      setMoved(!s || s.zoom !== map.getZoom() || Math.abs(c.lat - s.lat) > 1e-6 || Math.abs(c.lng - s.lng) > 1e-6);
    },
  });

  if (!moved) return null;
  const searchHere = () => {
    const c = map.getCenter();
    const ne = map.getBounds().getNorthEast();
    const center = { latitude: c.lat, longitude: c.lng };
    fromMap.current = true;
    onSearchArea(center, radiusForView(center, { latitude: ne.lat, longitude: ne.lng }));
    setMoved(false);
  };
  return (
    <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2">
      <Button size="sm" className="shadow-md" onClick={searchHere}>
        Search this area
      </Button>
    </div>
  );
}

const MapPage = () => {
  const [params, setParams] = useSearchUrl();
  const { campus, ready: campusReady } = useCampus();
  const effective = withCampusCenter(params, campus);
  // isPending, not isLoading: a query waiting on the campus is disabled, and disabled queries never "load".
  const { data: results = [], isPending: isLoading, error, refetch } = useSearchResults(effective, { enabled: campusReady });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const origin = distanceOrigin(params, campus);
  // Memoised so the marker layer only rebuilds when the results themselves change.
  const mapped = useMemo(() => results.filter((r) => r.listing.latitude !== null), [results]);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    listRef.current?.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const start = effective.center ?? FALLBACK_CENTER;

  return (
    <div className="page space-y-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-3xl font-semibold">Map</h1>
        <div className="w-full max-w-xl">
          <DescribeSearch campus={campus} onSearch={setParams} />
        </div>
      </div>
      <SearchToolbar params={params} onChange={setParams} campus={campus} count={mapped.length} view="map" />
      <SearchChips params={params} origin={origin} onChange={setParams} />

      {error && (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 p-4 text-sm" role="alert">
          <span>Couldn't load listings: {error.message}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative z-0 h-[60vh] flex-1 overflow-hidden rounded-lg border md:h-[calc(100vh-15rem)] md:min-h-[28rem]">
          <MapContainer center={[start.latitude, start.longitude]} zoom={DEFAULT_ZOOM} className="h-full w-full">
            <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
            {campus && <Marker position={[campus.latitude, campus.longitude]} icon={campusIcon} title={campus.name} />}
            {effective.center && params.radiusKm !== null && (
              <Circle
                center={[effective.center.latitude, effective.center.longitude]}
                radius={params.radiusKm * 1000}
                pathOptions={{ color: '#9c3f25', weight: 1, fillOpacity: 0.04 }}
              />
            )}
            <ClusteredMarkers results={mapped} selectedId={selectedId} onSelect={setSelectedId} />
            <SearchArea params={effective} onSearchArea={(center, radiusKm) => setParams({ ...params, center, radiusKm })} />
          </MapContainer>
          {isLoading && (
            <div className="absolute bottom-3 left-3 z-[1000] rounded border bg-card px-2 py-1 text-xs text-muted-foreground" role="status">
              Loading listings
            </div>
          )}
        </div>

        <aside className="md:h-[calc(100vh-15rem)] md:min-h-[28rem] md:w-80 md:overflow-y-auto" aria-label="Results">
          {!isLoading && mapped.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No listings here. Try a wider distance, fewer filters, or move the map and search this area.
            </p>
          ) : (
            <ul ref={listRef} className="space-y-2">
              {mapped.map(({ listing, distanceKm }) => {
                const selected = listing.id === selectedId;
                return (
                  <li
                    key={listing.id}
                    data-id={listing.id}
                    className={`overflow-hidden rounded-lg border bg-card transition-colors ${selected ? 'border-primary' : 'hover:border-foreground/25'}`}
                  >
                    <button type="button" onClick={() => setSelectedId(listing.id)} aria-pressed={selected} className="flex w-full gap-3 p-2 text-left">
                      <span className="h-16 w-20 shrink-0 overflow-hidden rounded">
                        <ListingCover listing={listing} size="thumb" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold tabular-nums">${listing.price.toLocaleString('en-CA')}</span>
                        <span className="block truncate text-sm">{listing.title}</span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {listingFacts(listing)}
                          {distanceKm !== null && ` · ${formatDistance(distanceKm)}`}
                        </span>
                      </span>
                    </button>
                    {selected && (
                      <Link href={`/listings/${listing.id}`} className="block border-t px-3 py-2 text-sm font-medium text-primary hover:underline">
                        View listing
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {results.length > mapped.length && (
            <p className="mt-2 text-xs text-muted-foreground">
              {results.length - mapped.length} more without a map location are in the list view.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default MapPage;
