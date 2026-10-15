/** The active search as removable chips: "Under $900", "2+ bedrooms", "Within 2 km of McMaster". */
import { DEFAULT_LISTING_FILTERS, PROPERTY_TYPE_LABELS, type SearchParams, type SortOption } from '@shared/schema';

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  'price-low': 'Price: low to high',
  'price-high': 'Price: high to low',
  distance: 'Nearest first',
};

export interface SearchChip {
  id: string;
  label: string;
  /** The search with just this chip removed. */
  without: SearchParams;
}

/** `origin` names where distances are measured from, e.g. "McMaster". */
export function searchChips(params: SearchParams, origin: string): SearchChip[] {
  const { filters } = params;
  const chips: SearchChip[] = [];
  const add = (id: string, label: string, patch: Partial<SearchParams['filters']>) =>
    chips.push({ id, label, without: { ...params, filters: { ...filters, ...patch } } });

  if (params.center && params.radiusKm !== null) {
    chips.push({ id: 'radius', label: `Within ${params.radiusKm} km of ${origin}`, without: { ...params, center: null, radiusKm: null } });
  }
  if (filters.minPrice !== null && filters.maxPrice !== null) {
    add('price', `$${filters.minPrice} to $${filters.maxPrice}`, { minPrice: null, maxPrice: null });
  } else if (filters.maxPrice !== null) {
    add('price', `Under $${filters.maxPrice}`, { maxPrice: null });
  } else if (filters.minPrice !== null) {
    add('price', `Over $${filters.minPrice}`, { minPrice: null });
  }
  if (filters.minBedrooms !== null) add('bedrooms', `${filters.minBedrooms}+ bedrooms`, { minBedrooms: null });
  if (filters.minBathrooms !== null) add('bathrooms', `${filters.minBathrooms}+ bathrooms`, { minBathrooms: null });
  for (const type of filters.propertyTypes) {
    add(`type-${type}`, PROPERTY_TYPE_LABELS[type], { propertyTypes: filters.propertyTypes.filter((t) => t !== type) });
  }
  if (filters.furnished !== null) add('furnished', filters.furnished ? 'Furnished' : 'Unfurnished', { furnished: null });
  if (filters.petsAllowed !== null) add('pets', filters.petsAllowed ? 'Pets allowed' : 'No pets', { petsAllowed: null });
  for (const amenity of filters.amenities) {
    add(`amenity-${amenity}`, amenity, { amenities: filters.amenities.filter((a) => a !== amenity) });
  }
  if (filters.sortBy !== DEFAULT_LISTING_FILTERS.sortBy) add('sort', SORT_LABELS[filters.sortBy], { sortBy: DEFAULT_LISTING_FILTERS.sortBy });
  return chips;
}
