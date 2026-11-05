import { describe, expect, it } from 'vitest';
import { safeNextPath, signInHref } from './redirect';

describe('safeNextPath', () => {
  it('returns a path on this site, including its query string', () => {
    expect(safeNextPath('?next=%2Fedit-listing%2Fabc')).toBe('/edit-listing/abc');
    expect(safeNextPath(signInHref('/listings?maxPrice=900').split('?')[1])).toBe('/listings?maxPrice=900');
  });

  it('falls back for missing, external or protocol-relative targets', () => {
    expect(safeNextPath('')).toBe('/profile');
    expect(safeNextPath('?next=https%3A%2F%2Fevil.com')).toBe('/profile');
    expect(safeNextPath('?next=%2F%2Fevil.com')).toBe('/profile');
    expect(safeNextPath('?next=%2F%5Cevil.com')).toBe('/profile');
    expect(safeNextPath('?next=javascript%3Aalert(1)')).toBe('/profile');
  });
});
