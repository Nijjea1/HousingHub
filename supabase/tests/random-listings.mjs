// Deterministic random listings around McMaster for the parity test and the benchmark.

export const MCMASTER = { latitude: 43.2609, longitude: -79.9192 };
export const USER_ID = '00000000-0000-0000-0000-0000000000aa';

/** mulberry32: a small seeded PRNG, so every run generates the same data. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TYPES = ['apartment', 'house', 'dormitory', 'studio'];
const AMENITIES = ['WiFi', 'wifi', 'Laundry', 'Parking', 'Gym', 'Dishwasher'];

/**
 * `count` listings scattered within `spreadKm` of McMaster. Some have no coordinates,
 * some are unavailable, and created_at repeats so the id tie-break gets exercised.
 */
export function randomListings(count, { seed = 42, spreadKm = 15 } = {}) {
  const r = rng(seed);
  const pick = (items) => items[Math.floor(r() * items.length)];
  const kmPerDegLat = 111.195;
  const kmPerDegLng = kmPerDegLat * Math.cos((MCMASTER.latitude * Math.PI) / 180);
  const round6 = (x) => Math.round(x * 1e6) / 1e6;

  return Array.from({ length: count }, (_, i) => {
    const hasCoords = r() > 0.05;
    // A random first group shuffles id order; the index in the last group keeps ids unique.
    const id = `${Math.floor(r() * 2 ** 32).toString(16).padStart(8, '0')}-0000-4000-8000-${i.toString(16).padStart(12, '0')}`;
    return {
      id,
      userId: USER_ID,
      universityId: 'mcmaster',
      title: `Listing ${i}`,
      description: 'A place near campus.',
      detailedDescription: null,
      price: 400 + Math.floor(r() * 30) * 50,
      propertyType: pick(TYPES),
      bedrooms: Math.floor(r() * 6),
      bathrooms: pick([1, 1, 1.5, 2, 2.5, 3]),
      squareFeet: null,
      address: 'Sterling St',
      neighborhood: null,
      city: 'Hamilton',
      province: 'ON',
      postalCode: 'L8S 4H9',
      latitude: hasCoords ? round6(MCMASTER.latitude + ((r() * 2 - 1) * spreadKm) / kmPerDegLat) : null,
      longitude: hasCoords ? round6(MCMASTER.longitude + ((r() * 2 - 1) * spreadKm) / kmPerDegLng) : null,
      amenities: AMENITIES.filter(() => r() < 0.35),
      images: [],
      utilitiesIncluded: [],
      nearbyPlaces: [],
      isAvailable: r() > 0.1,
      availableFrom: null,
      leaseTerm: null,
      petsAllowed: r() < 0.4,
      furnished: r() < 0.5,
      distanceFromCampus: null,
      createdAt: new Date(Date.UTC(2026, 8, 1 + Math.floor(r() * 20))).toISOString(),
      updatedAt: new Date(Date.UTC(2026, 8, 1)).toISOString(),
    };
  });
}

/** Inserts listings as the superuser, bypassing RLS, in batches. */
export async function insertListings(db, listings) {
  await db.exec(`insert into auth.users (id, email) values ('${USER_ID}', 'seed@test.dev') on conflict do nothing`);
  const cols = ['id', 'user_id', 'university_id', 'title', 'description', 'price', 'property_type', 'bedrooms', 'bathrooms',
    'address', 'city', 'province', 'postal_code', 'latitude', 'longitude', 'amenities', 'is_available', 'pets_allowed',
    'furnished', 'created_at', 'updated_at'];
  const values = (l) => [l.id, l.userId, l.universityId, l.title, l.description, l.price, l.propertyType, l.bedrooms,
    l.bathrooms, l.address, l.city, l.province, l.postalCode, l.latitude, l.longitude, l.amenities, l.isAvailable,
    l.petsAllowed, l.furnished, l.createdAt, l.updatedAt];
  for (let start = 0; start < listings.length; start += 500) {
    const batch = listings.slice(start, start + 500);
    const params = [];
    const rows = batch.map((l) => {
      const placeholders = values(l).map((v) => { params.push(v); return `$${params.length}`; });
      return `(${placeholders.join(', ')})`;
    });
    await db.query(`insert into public.listings (${cols.join(', ')}) values ${rows.join(', ')}`, params);
  }
}
