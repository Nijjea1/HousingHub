import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
const { listingFacts } = await import('./ListingCard');

describe('listingFacts', () => {
  it('lists rooms, then the type', () => {
    expect(listingFacts({ bedrooms: 2, bathrooms: 1, propertyType: 'apartment' })).toBe('2 beds · 1 bath · Apartment');
    expect(listingFacts({ bedrooms: 1, bathrooms: 1.5, propertyType: 'house' })).toBe('1 bed · 1.5 baths · House');
  });

  it('leaves out bedrooms for a studio with none', () => {
    expect(listingFacts({ bedrooms: 0, bathrooms: 1, propertyType: 'studio' })).toBe('1 bath · Studio');
  });
});
