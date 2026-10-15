import { describe, expect, it } from 'vitest';
import { DEFAULT_SEARCH_PARAMS, type University } from '@shared/schema';
import { distanceOrigin, formatDistance, pickCampus, radiusForView, withCampusCenter } from './map';

const uni = (id: string): University => ({
  id,
  name: id,
  shortName: id,
  city: 'Hamilton',
  province: 'ON',
  latitude: 43.26,
  longitude: -79.92,
  isActive: true,
});

describe('formatDistance', () => {
  it('uses metres under 1 km and one decimal above', () => {
    expect(formatDistance(0.6504)).toBe('650 m');
    expect(formatDistance(1.25)).toBe('1.3 km');
    expect(formatDistance(12)).toBe('12.0 km');
  });
});

describe('radiusForView', () => {
  const center = { latitude: 43.26, longitude: -79.92 };

  it('rounds the center-to-corner distance up to 0.1 km', () => {
    // 0.01 degrees of latitude is about 1.112 km.
    expect(radiusForView(center, { latitude: 43.27, longitude: -79.92 })).toBe(1.2);
  });

  it('caps the radius at the API limit and never returns 0', () => {
    expect(radiusForView(center, { latitude: 45, longitude: -75 })).toBe(50);
    expect(radiusForView(center, center)).toBe(0.1);
  });
});

describe('pickCampus', () => {
  it("prefers the user's university, then McMaster, then the first one", () => {
    const list = [uni('waterloo'), uni('mcmaster')];
    expect(pickCampus(list, 'waterloo')?.id).toBe('waterloo');
    expect(pickCampus(list, null)?.id).toBe('mcmaster');
    expect(pickCampus([uni('waterloo')], 'nope')?.id).toBe('waterloo');
    expect(pickCampus([], null)).toBeNull();
  });
});

describe('withCampusCenter and distanceOrigin', () => {
  const campus = uni('mcmaster');

  it('fills a missing center from the campus and keeps an explicit one', () => {
    expect(withCampusCenter(DEFAULT_SEARCH_PARAMS, campus).center).toEqual({ latitude: 43.26, longitude: -79.92 });
    const elsewhere = { ...DEFAULT_SEARCH_PARAMS, center: { latitude: 43.3, longitude: -79.8 } };
    expect(withCampusCenter(elsewhere, campus)).toBe(elsewhere);
    expect(withCampusCenter(DEFAULT_SEARCH_PARAMS, null)).toBe(DEFAULT_SEARCH_PARAMS);
  });

  it('names the campus when measuring from it, otherwise the map center', () => {
    expect(distanceOrigin(DEFAULT_SEARCH_PARAMS, campus)).toBe('mcmaster');
    expect(distanceOrigin({ ...DEFAULT_SEARCH_PARAMS, center: { latitude: 43.26001, longitude: -79.92 } }, campus)).toBe('mcmaster');
    expect(distanceOrigin({ ...DEFAULT_SEARCH_PARAMS, center: { latitude: 43.3, longitude: -79.8 } }, campus)).toBe('the map center');
  });
});
