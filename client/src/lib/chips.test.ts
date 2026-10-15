import { describe, expect, it } from 'vitest';
import { DEFAULT_LISTING_FILTERS, DEFAULT_SEARCH_PARAMS, type SearchParams } from '@shared/schema';
import { searchChips } from './chips';

const search: SearchParams = {
  ...DEFAULT_SEARCH_PARAMS,
  center: { latitude: 43.26, longitude: -79.92 },
  radiusKm: 2,
  filters: {
    ...DEFAULT_LISTING_FILTERS,
    maxPrice: 900,
    minBedrooms: 2,
    propertyTypes: ['house', 'studio'],
    furnished: false,
    amenities: ['WiFi'],
    sortBy: 'distance',
  },
};

describe('searchChips', () => {
  it('describes every active filter in plain words', () => {
    expect(searchChips(search, 'McMaster').map((c) => c.label)).toEqual([
      'Within 2 km of McMaster',
      'Under $900',
      '2+ bedrooms',
      'House',
      'Studio',
      'Unfurnished',
      'WiFi',
      'Nearest first',
    ]);
  });

  it('removes only its own filter', () => {
    const chips = searchChips(search, 'McMaster');
    const house = chips.find((c) => c.id === 'type-house')!;
    expect(house.without.filters.propertyTypes).toEqual(['studio']);
    expect(house.without.filters.maxPrice).toBe(900);

    const radius = chips.find((c) => c.id === 'radius')!;
    expect([radius.without.center, radius.without.radiusKm]).toEqual([null, null]);
    expect(radius.without.filters).toBe(search.filters);
  });

  it('shows a price range as one chip and nothing for the default search', () => {
    const range = { ...search, filters: { ...DEFAULT_LISTING_FILTERS, minPrice: 700, maxPrice: 1000 } };
    expect(searchChips(range, 'McMaster').map((c) => c.label)).toEqual(['Within 2 km of McMaster', '$700 to $1000']);
    expect(searchChips(DEFAULT_SEARCH_PARAMS, 'McMaster')).toEqual([]);
  });
});
