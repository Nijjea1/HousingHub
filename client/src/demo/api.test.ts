import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { DEFAULT_LISTING_FILTERS, type Listing, type ListingInput } from '@shared/schema';
import { MAX_SAVED_SEARCHES, demoApi } from './api';
import { getState, mutate, onRowEvent, reloadFromStorage, resetDemo, type RowEvent } from './store';

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
  reloadFromStorage();
  resetDemo();
});

const userId = (email: string) => getState().users.find((u) => u.email === email)!.id;
const student = () => userId('demo-student@example.com');
const landlord = () => userId('demo-landlord@example.com');
const signInAs = (id: string | null) => mutate((s) => void (s.sessionUserId = id));

const get = <T = any>(path: string) => demoApi<T>(path);
const send = <T = any>(method: string, path: string, body?: unknown) => demoApi<T>(path, { method, body });
const fails = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    return e as ApiError;
  }
  throw new Error('expected the call to fail');
};

const validListing = (overrides: Partial<ListingInput> = {}): ListingInput => ({
  title: 'Room near campus',
  description: 'A bright room close to McMaster.',
  detailedDescription: null,
  price: 800,
  propertyType: 'house',
  bedrooms: 3,
  bathrooms: 1,
  squareFeet: null,
  address: 'Sterling St',
  neighborhood: null,
  city: 'Hamilton',
  province: 'ON',
  postalCode: 'L8S 4H9',
  universityId: 'mcmaster',
  latitude: null,
  longitude: null,
  amenities: [],
  images: [],
  utilitiesIncluded: [],
  nearbyPlaces: [],
  isAvailable: true,
  availableFrom: null,
  leaseTerm: null,
  petsAllowed: false,
  furnished: false,
  distanceFromCampus: null,
  ...overrides,
});

const firstListingId = () => getState().listings[0].id;
const tomorrow = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();

describe('search and listings', () => {
  it('answers /health', async () => {
    expect(await get('/health')).toEqual({ ok: true });
  });

  it('searches all seeded listings with camelCase shapes and no distance without a center', async () => {
    const { results } = await get<{ results: Array<{ listing: Listing; distanceKm: number | null }> }>('/search');
    expect(results).toHaveLength(8);
    expect(results[0].listing).toHaveProperty('postalCode');
    expect(results.every((r) => r.distanceKm === null)).toBe(true);
  });

  it('filters like the real search: max price, and distance sorting around campus', async () => {
    const cheap = await get<{ results: Array<{ listing: Listing }> }>('/search?maxPrice=800');
    expect(cheap.results.length).toBeGreaterThan(0);
    expect(cheap.results.every((r) => r.listing.price <= 800)).toBe(true);

    const near = await get<{ results: Array<{ listing: Listing; distanceKm: number }> }>('/search?lat=43.2609&lng=-79.9192&radiusKm=1&sort=distance');
    expect(near.results.length).toBeGreaterThan(0);
    expect(near.results.every((r) => r.distanceKm <= 1)).toBe(true);
    const distances = near.results.map((r) => r.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('rejects an invalid search with field messages', async () => {
    const err = await fails(get('/search?radiusKm=9999'));
    expect(err.status).toBe(400);
  });

  it('turns a sentence into filters', async () => {
    const parsed = await send('POST', '/search/parse', { query: '2 bedroom under $900 within 2 km of campus' });
    expect(parsed.filters.maxPrice).toBe(900);
    expect(parsed.radiusKm).toBe(2);
    expect((await fails(send('POST', '/search/parse', { query: '   ' }))).status).toBe(400);
  });

  it('lists, reads one, and reports bad and unknown ids', async () => {
    expect((await get('/listings')).listings).toHaveLength(8);
    const id = firstListingId();
    expect((await get(`/listings/${id}`)).listing.id).toBe(id);
    expect((await fails(get('/listings/not-a-uuid'))).status).toBe(400);
    expect((await fails(get('/listings/00000000-0000-4000-8000-0000000000ff'))).status).toBe(404);
  });

  it('shows "my listings" only to the signed-in owner', async () => {
    expect((await fails(get('/listings?mine=true'))).status).toBe(401);
    signInAs(landlord());
    expect((await get('/listings?mine=true')).listings.length).toBe(8);
    signInAs(student());
    expect((await get('/listings?mine=true')).listings).toEqual([]);
  });

  it('returns copies, so callers cannot edit the stored data', async () => {
    const { listing } = await get(`/listings/${firstListingId()}`);
    listing.title = 'changed by a caller';
    expect(getState().listings[0].title).not.toBe('changed by a caller');
  });
});

describe('creating, editing and deleting listings', () => {
  it('needs a signed-in user', async () => {
    expect((await fails(send('POST', '/listings', validListing()))).status).toBe(401);
  });

  it('creates a listing owned by the caller, without a map position because there is no geocoder', async () => {
    signInAs(landlord());
    const { listing } = await send('POST', '/listings', validListing({ latitude: 1, longitude: 2 }));
    expect(listing).toMatchObject({ userId: landlord(), title: 'Room near campus', latitude: null, longitude: null });
    expect((await get('/listings')).listings).toHaveLength(9);
    expect((await get('/listings?mine=true')).listings[0].id).toBe(listing.id);
  });

  it('answers 400 with field messages for bad input', async () => {
    signInAs(landlord());
    const err = await fails(send('POST', '/listings', validListing({ price: -5, title: '' })));
    expect(err.status).toBe(400);
    expect(Object.keys(err.fields ?? {})).toEqual(expect.arrayContaining(['price', 'title']));
  });

  it('lets only the owner edit or delete', async () => {
    const id = firstListingId();
    signInAs(student());
    expect((await fails(send('PATCH', `/listings/${id}`, { price: 1 }))).status).toBe(403);
    expect((await fails(send('DELETE', `/listings/${id}`))).status).toBe(403);

    signInAs(landlord());
    const { listing } = await send('PATCH', `/listings/${id}`, { price: 777 });
    expect(listing.price).toBe(777);
    expect(listing.latitude).not.toBeNull();
    expect((await fails(send('PATCH', `/listings/${id}`, { price: -1 }))).status).toBe(400);
    expect((await fails(send('PATCH', '/listings/00000000-0000-4000-8000-0000000000ff', { price: 1 }))).status).toBe(404);
  });

  it('deletes a listing and what hangs off it', async () => {
    const id = firstListingId();
    signInAs(student());
    await send('POST', `/listings/${id}/reviews`, { rating: 4, body: 'Nice' });
    await send('POST', '/conversations', { listingId: id, content: 'Hello' });
    mutate((s) => void s.favorites.push({ id: 'f1', user_id: student(), listing_id: id, note: null, collection_name: null, created_at: '2026-11-05T00:00:00.000Z' }));

    signInAs(landlord());
    expect(await send('DELETE', `/listings/${id}`)).toBeUndefined();
    const s = getState();
    expect(s.listings.some((l) => l.id === id)).toBe(false);
    expect(s.reviews.some((r) => r.listingId === id)).toBe(false);
    expect(s.favorites.some((f) => f.listing_id === id)).toBe(false);
    expect(s.conversations.some((c) => c.listing_id === id)).toBe(false);
    expect(s.messages.some((m) => m.listing_id === id)).toBe(false);
  });
});

describe('saved searches', () => {
  const search = { name: 'Near campus', params: { center: { latitude: 43.26, longitude: -79.92 }, radiusKm: 2, filters: { ...DEFAULT_LISTING_FILTERS, maxPrice: 1000 } } };

  it('needs a signed-in user, saves, lists and deletes', async () => {
    expect((await fails(get('/saved-searches'))).status).toBe(401);
    signInAs(student());
    const { savedSearch } = await send('POST', '/saved-searches', search);
    expect(savedSearch).toMatchObject({ name: 'Near campus', userId: student() });
    expect((await get('/saved-searches')).savedSearches).toHaveLength(1);
    expect(await send('DELETE', `/saved-searches/${savedSearch.id}`)).toBeUndefined();
    expect((await get('/saved-searches')).savedSearches).toEqual([]);
  });

  it('keeps them private and validates the name', async () => {
    signInAs(student());
    const { savedSearch } = await send('POST', '/saved-searches', search);
    expect((await fails(send('POST', '/saved-searches', { ...search, name: '  ' }))).status).toBe(400);
    signInAs(landlord());
    expect((await get('/saved-searches')).savedSearches).toEqual([]);
    expect((await fails(send('DELETE', `/saved-searches/${savedSearch.id}`))).status).toBe(404);
  });

  it('caps how many one person can save', async () => {
    signInAs(student());
    for (let i = 0; i < MAX_SAVED_SEARCHES; i++) await send('POST', '/saved-searches', { ...search, name: `Search ${i}` });
    const err = await fails(send('POST', '/saved-searches', { ...search, name: 'One too many' }));
    expect(err.status).toBe(400);
  });
});

describe('viewing requests', () => {
  it('lets a student propose a time and the owner answer it', async () => {
    const id = firstListingId();
    signInAs(student());
    const { viewingRequest } = await send('POST', `/listings/${id}/viewings`, { proposedAt: tomorrow(), message: 'Thursday?' });
    expect(viewingRequest).toMatchObject({ studentId: student(), landlordId: landlord(), status: 'pending' });

    expect((await fails(send('PATCH', `/viewings/${viewingRequest.id}`, { status: 'accepted' }))).status).toBe(404);
    expect((await get('/viewings')).viewingRequests).toHaveLength(1);

    signInAs(landlord());
    expect((await get('/viewings')).viewingRequests).toHaveLength(1);
    expect((await fails(send('PATCH', `/viewings/${viewingRequest.id}`, { status: 'pending' }))).status).toBe(400);
    const answered = await send('PATCH', `/viewings/${viewingRequest.id}`, { status: 'accepted' });
    expect(answered.viewingRequest.status).toBe('accepted');
  });

  it('rejects the past, your own listing, bad dates and unknown listings', async () => {
    const id = firstListingId();
    signInAs(student());
    const past = new Date(Date.now() - 3600 * 1000).toISOString();
    expect((await fails(send('POST', `/listings/${id}/viewings`, { proposedAt: past }))).status).toBe(400);
    expect((await fails(send('POST', `/listings/${id}/viewings`, { proposedAt: 'tomorrow' }))).status).toBe(400);
    expect((await fails(send('POST', '/listings/00000000-0000-4000-8000-0000000000ff/viewings', { proposedAt: tomorrow() }))).status).toBe(404);
    signInAs(landlord());
    expect((await fails(send('POST', `/listings/${id}/viewings`, { proposedAt: tomorrow() }))).status).toBe(400);
  });

  it('hides requests from people who are not part of them', async () => {
    const id = firstListingId();
    signInAs(student());
    await send('POST', `/listings/${id}/viewings`, { proposedAt: tomorrow() });
    signInAs(null);
    expect((await fails(get('/viewings'))).status).toBe(401);
  });
});

describe('reviews', () => {
  it('is public to read, starts empty, and averages ratings with author names', async () => {
    const id = firstListingId();
    expect(await get(`/listings/${id}/reviews`)).toEqual({ reviews: [], count: 0, average: null });
    signInAs(student());
    const { review } = await send('POST', `/listings/${id}/reviews`, { rating: 5, body: 'Great landlord' });
    expect(review.authorName).toBe('Sam Student');
    mutate((s) => void s.reviews.push({ ...review, id: 'r2', authorId: 'someone-else', rating: 4, createdAt: '2026-01-01T00:00:00.000Z' }));
    const list = await get(`/listings/${id}/reviews`);
    expect(list.count).toBe(2);
    expect(list.average).toBe(4.5);
  });

  it('allows one review per person, never by the owner, and validates input', async () => {
    const id = firstListingId();
    signInAs(student());
    await send('POST', `/listings/${id}/reviews`, { rating: 5, body: 'Great' });
    expect((await fails(send('POST', `/listings/${id}/reviews`, { rating: 4, body: 'Again' }))).status).toBe(409);
    expect((await fails(send('POST', `/listings/${id}/reviews`, { rating: 6, body: 'x' }))).status).toBe(400);
    expect((await fails(send('POST', `/listings/${id}/reviews`, { rating: 3.5, body: 'x' }))).status).toBe(400);
    expect((await fails(send('POST', `/listings/${id}/reviews`, { rating: 3, body: '   ' }))).status).toBe(400);
    signInAs(landlord());
    expect((await fails(send('POST', `/listings/${id}/reviews`, { rating: 5, body: 'Mine' }))).status).toBe(403);
    signInAs(null);
    expect((await fails(send('POST', `/listings/${id}/reviews`, { rating: 5, body: 'x' }))).status).toBe(401);
  });
});

describe('conversations', () => {
  it('starts a conversation with the owner and reuses it for the same listing', async () => {
    const id = getState().listings.find((l) => l.id !== getState().conversations[0].listing_id)!.id;
    signInAs(student());
    const first = await send('POST', '/conversations', { listingId: id, content: 'Is it available?' });
    expect(first.conversation).toMatchObject({ listingId: id, studentId: student(), landlordId: landlord() });
    expect(first.message).toMatchObject({ senderId: student(), receiverId: landlord(), isRead: false, content: 'Is it available?' });
    const second = await send('POST', '/conversations', { listingId: id, content: 'Also, pets?' });
    expect(second.conversation.id).toBe(first.conversation.id);
    expect(getState().conversations).toHaveLength(2);
  });

  it('lets both people reply, bumps the thread and announces each message', async () => {
    const events: RowEvent[] = [];
    const stop = onRowEvent((e) => events.push(e));
    const conversationId = getState().conversations[0].id;
    signInAs(landlord());
    const { message } = await send('POST', `/conversations/${conversationId}/messages`, { content: 'See you Thursday' });
    stop();
    expect(message).toMatchObject({ senderId: landlord(), receiverId: student() });
    expect(getState().conversations[0].last_message_at).toBe(message.createdAt);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ table: 'messages', eventType: 'INSERT' });
  });

  it('refuses outsiders, signed-out callers, empty messages and your own listing', async () => {
    const conversationId = getState().conversations[0].id;
    signInAs(null);
    expect((await fails(send('POST', `/conversations/${conversationId}/messages`, { content: 'hi' }))).status).toBe(401);
    mutate((s) => {
      s.users.push({ id: '00000000-0000-4000-8000-0000000000aa', email: 'out@x.dev', passwordHash: 'x', metadata: {}, createdAt: '' });
      s.sessionUserId = '00000000-0000-4000-8000-0000000000aa';
    });
    expect((await fails(send('POST', `/conversations/${conversationId}/messages`, { content: 'hi' }))).status).toBe(404);
    signInAs(student());
    expect((await fails(send('POST', `/conversations/${conversationId}/messages`, { content: '   ' }))).status).toBe(400);
    signInAs(landlord());
    expect((await fails(send('POST', '/conversations', { listingId: firstListingId(), content: 'hi' }))).status).toBe(400);
  });
});

describe('other routes', () => {
  it('reports commute times as not configured so the page hides them', async () => {
    const err = await fails(get(`/listings/${firstListingId()}/commute?mode=walk`));
    expect(err.status).toBe(503);
  });

  it('answers 404 for unknown routes and methods', async () => {
    expect((await fails(get('/nope'))).status).toBe(404);
    expect((await fails(send('PUT', '/listings'))).status).toBe(404);
  });
});
