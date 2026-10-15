import L from 'leaflet';

/** Leaflet markers drawn as HTML, because bundlers don't resolve Leaflet's default pin images. */

// lucide's graduation cap, inlined so markers don't depend on an icon font.
const CAP =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>';

export const campusIcon = L.divIcon({
  className: '',
  html: `<span class="map-campus" aria-label="Campus">${CAP}</span>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const priceIcon = (price: number, selected: boolean) =>
  L.divIcon({
    className: '',
    html: `<span class="map-price${selected ? ' map-price-selected' : ''}">$${Math.round(price)}</span>`,
    iconSize: undefined,
  });

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
