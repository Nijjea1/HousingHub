/** The API, answered from the browser: the same routes, shapes and error messages as server/*.ts, over the demo store. */
import { z } from 'zod';
import { ApiError } from '@/lib/api-error';
import {
  conversationFromRow,
  listingFromRow,
  listingToRow,
  messageFromRow,
  type ConversationRow,
  type ListingRow,
  type MessageRow,
} from '@shared/mappers';
import { parseSearch } from '@shared/parse-search';
import {
  MAX_SEARCH_LIMIT,
  listingFiltersQuerySchema,
  listingInputSchema,
  messageInputSchema,
  parseSearchRequestSchema,
  parsedSearchSchema,
  reviewInputSchema,
  savedSearchInputSchema,
  searchQuerySchema,
  startConversationSchema,
  viewingRequestInputSchema,
  viewingStatusUpdateSchema,
  type Listing,
  type Review,
  type SavedSearch,
  type ViewingRequest,
} from '@shared/schema';
import { searchInMemory } from '@shared/search';
import { currentUser, emitRowEvent, getState, mutate, newId, nowIso } from './store';

export const MAX_SAVED_SEARCHES = 25;

const idSchema = z.string().uuid('Not a valid id');

/** Parses untrusted input or throws a 400 with one message list per field, like the server's parseInput. */
function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const { fieldErrors, formErrors } = result.error.flatten();
    throw new ApiError(400, formErrors[0] ?? 'Invalid input', fieldErrors);
  }
  return result.data;
}

const requireUser = () => {
  const user = currentUser();
  if (!user) throw new ApiError(401, 'Sign in required');
  return user;
};

const allListings = (): Listing[] => getState().listings.map(listingFromRow);

function findListing(id: string): ListingRow {
  const row = getState().listings.find((l) => l.id === parse(idSchema, id));
  if (!row) throw new ApiError(404, 'Listing not found');
  return row;
}

function ownedListing(id: string, userId: string): ListingRow {
  const row = findListing(id);
  if (row.user_id !== userId) throw new ApiError(403, 'You can only change your own listings');
  return row;
}

const profileName = (userId: string) => getState().profiles.find((p) => p.id === userId)?.full_name ?? null;

type Handler = (ctx: { params: string[]; query: Record<string, string>; body: unknown }) => unknown;

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [];
const route = (method: string, pattern: RegExp, handler: Handler) => routes.push({ method, pattern, handler });

route('GET', /^\/health$/, () => ({ ok: true }));

// Search and listings

route('GET', /^\/search$/, ({ query }) => ({ results: searchInMemory(allListings(), parse(searchQuerySchema, query)) }));

route('POST', /^\/search\/parse$/, ({ body }) => {
  const { query } = parse(parseSearchRequestSchema, body);
  return parsedSearchSchema.parse(parseSearch(query));
});

route('GET', /^\/listings$/, ({ query }) => {
  if (query.mine === 'true') {
    const user = requireUser();
    const mine = getState()
      .listings.filter((l) => l.user_id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { listings: mine.map(listingFromRow) };
  }
  const { mine: _mine, ...rest } = query;
  const filters = parse(listingFiltersQuerySchema, rest);
  const results = searchInMemory(allListings(), { center: null, radiusKm: null, filters, limit: MAX_SEARCH_LIMIT });
  return { listings: results.map((r) => r.listing) };
});

route('GET', /^\/listings\/([^/]+)$/, ({ params }) => ({ listing: listingFromRow(findListing(params[0])) }));

route('POST', /^\/listings$/, ({ body }) => {
  const user = requireUser();
  const input = parse(listingInputSchema, body);
  const stamp = nowIso();
  // The real API geocodes the address. The demo has no geocoder, so a new listing has no map position.
  const row: ListingRow = { ...listingToRow({ ...input, latitude: null, longitude: null }), id: newId(), user_id: user.id, created_at: stamp, updated_at: stamp };
  mutate((s) => void s.listings.push(row));
  return { listing: listingFromRow(row) };
});

route('PATCH', /^\/listings\/([^/]+)$/, ({ params, body }) => {
  const user = requireUser();
  const existing = listingFromRow(ownedListing(params[0], user.id));
  const patch = parse(listingInputSchema.partial(), body);
  // Re-validate the merged listing so a partial update can't leave it in an invalid state.
  const merged = parse(listingInputSchema, { ...existing, ...patch });
  const updated: ListingRow = {
    ...listingToRow({ ...merged, latitude: existing.latitude, longitude: existing.longitude }),
    id: existing.id,
    user_id: existing.userId,
    created_at: existing.createdAt,
    updated_at: nowIso(),
  };
  mutate((s) => void (s.listings = s.listings.map((l) => (l.id === updated.id ? updated : l))));
  return { listing: listingFromRow(updated) };
});

route('DELETE', /^\/listings\/([^/]+)$/, ({ params }) => {
  const user = requireUser();
  const row = ownedListing(params[0], user.id);
  mutate((s) => {
    s.listings = s.listings.filter((l) => l.id !== row.id);
    s.favorites = s.favorites.filter((f) => f.listing_id !== row.id);
    s.reviews = s.reviews.filter((r) => r.listingId !== row.id);
    s.viewing_requests = s.viewing_requests.filter((v) => v.listingId !== row.id);
    const gone = new Set(s.conversations.filter((c) => c.listing_id === row.id).map((c) => c.id));
    s.conversations = s.conversations.filter((c) => !gone.has(c.id));
    s.messages = s.messages.filter((m) => !m.conversation_id || !gone.has(m.conversation_id));
  });
  return undefined;
});

// Commute times need a routing provider, which a browser-only demo does not have.
route('GET', /^\/listings\/([^/]+)\/commute$/, () => {
  throw new ApiError(503, 'Commute times are not configured');
});

// Saved searches

route('GET', /^\/saved-searches$/, () => {
  const user = requireUser();
  const mine = getState()
    .saved_searches.filter((s) => s.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { savedSearches: mine };
});

route('POST', /^\/saved-searches$/, ({ body }) => {
  const user = requireUser();
  const input = parse(savedSearchInputSchema, body);
  if (getState().saved_searches.filter((s) => s.userId === user.id).length >= MAX_SAVED_SEARCHES) {
    throw new ApiError(400, `You can save up to ${MAX_SAVED_SEARCHES} searches`);
  }
  const savedSearch: SavedSearch = { id: newId(), userId: user.id, name: input.name, params: input.params, createdAt: nowIso() };
  mutate((s) => void s.saved_searches.push(savedSearch));
  return { savedSearch };
});

route('DELETE', /^\/saved-searches\/([^/]+)$/, ({ params }) => {
  const user = requireUser();
  const id = parse(idSchema, params[0]);
  if (!getState().saved_searches.some((s) => s.id === id && s.userId === user.id)) throw new ApiError(404, 'Saved search not found');
  mutate((s) => void (s.saved_searches = s.saved_searches.filter((x) => x.id !== id)));
  return undefined;
});

// Viewing requests

route('POST', /^\/listings\/([^/]+)\/viewings$/, ({ params, body }) => {
  const user = requireUser();
  const listingId = parse(idSchema, params[0]);
  const { proposedAt, message } = parse(viewingRequestInputSchema, body);
  if (new Date(proposedAt).getTime() <= Date.now()) {
    throw new ApiError(400, 'Pick a time in the future', { proposedAt: ['Pick a time in the future'] });
  }
  const listing = findListing(listingId);
  if (listing.user_id === user.id) throw new ApiError(400, 'This is your own listing');
  const viewingRequest: ViewingRequest = {
    id: newId(),
    listingId,
    studentId: user.id,
    landlordId: listing.user_id,
    proposedAt,
    message,
    status: 'pending',
    createdAt: nowIso(),
  };
  mutate((s) => void s.viewing_requests.push(viewingRequest));
  return { viewingRequest };
});

route('GET', /^\/viewings$/, () => {
  const user = requireUser();
  const mine = getState()
    .viewing_requests.filter((v) => v.studentId === user.id || v.landlordId === user.id)
    .sort((a, b) => a.proposedAt.localeCompare(b.proposedAt));
  return { viewingRequests: mine };
});

route('PATCH', /^\/viewings\/([^/]+)$/, ({ params, body }) => {
  const user = requireUser();
  const id = parse(idSchema, params[0]);
  const { status } = parse(viewingStatusUpdateSchema, body);
  // Only the listing's owner answers, so anyone else sees "not found", like the database policy.
  const existing = getState().viewing_requests.find((v) => v.id === id && v.landlordId === user.id);
  if (!existing) throw new ApiError(404, 'Viewing request not found');
  const viewingRequest = { ...existing, status };
  mutate((s) => void (s.viewing_requests = s.viewing_requests.map((v) => (v.id === id ? viewingRequest : v))));
  return { viewingRequest };
});

// Reviews

const reviewsOf = (listingId: string): Review[] =>
  getState()
    .reviews.filter((r) => r.listingId === listingId)
    .map((r) => ({ ...r, authorName: profileName(r.authorId) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

route('GET', /^\/listings\/([^/]+)\/reviews$/, ({ params }) => {
  const listing = findListing(params[0]);
  const reviews = reviewsOf(listing.id);
  const average = reviews.length ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : null;
  return { reviews, count: reviews.length, average };
});

route('POST', /^\/listings\/([^/]+)\/reviews$/, ({ params, body }) => {
  const user = requireUser();
  const { rating, body: text } = parse(reviewInputSchema, body);
  const listing = findListing(params[0]);
  if (listing.user_id === user.id) throw new ApiError(403, "You can't do that");
  if (getState().reviews.some((r) => r.listingId === listing.id && r.authorId === user.id)) throw new ApiError(409, 'That already exists');
  const review: Review = { id: newId(), listingId: listing.id, authorId: user.id, authorName: profileName(user.id), rating, body: text, createdAt: nowIso() };
  mutate((s) => void s.reviews.push(review));
  return { review };
});

// Conversations. The inbox itself is read through the supabase stand-in, as in the real app.

function addMessage(conversation: ConversationRow, senderId: string, content: string): MessageRow {
  const message: MessageRow = {
    id: newId(),
    conversation_id: conversation.id,
    sender_id: senderId,
    receiver_id: senderId === conversation.student_id ? conversation.landlord_id : conversation.student_id,
    listing_id: conversation.listing_id,
    content,
    is_read: false,
    created_at: nowIso(),
  };
  mutate((s) => {
    s.messages.push(message);
    s.conversations = s.conversations.map((c) => (c.id === conversation.id ? { ...c, last_message_at: message.created_at } : c));
  });
  emitRowEvent({ table: 'messages', eventType: 'INSERT', new: message as unknown as Record<string, unknown> });
  return message;
}

route('POST', /^\/conversations$/, ({ body }) => {
  const user = requireUser();
  const { listingId, content } = parse(startConversationSchema, body);
  const listing = findListing(listingId);
  if (listing.user_id === user.id) throw new ApiError(400, 'This is your own listing');
  let conversation = getState().conversations.find((c) => c.listing_id === listingId && c.student_id === user.id);
  if (!conversation) {
    const created: ConversationRow = { id: newId(), listing_id: listingId, student_id: user.id, landlord_id: listing.user_id, created_at: nowIso(), last_message_at: nowIso() };
    mutate((s) => void s.conversations.push(created));
    conversation = created;
  }
  const message = addMessage(conversation, user.id, content);
  return { conversation: conversationFromRow(getState().conversations.find((c) => c.id === conversation!.id)!), message: messageFromRow(message) };
});

route('POST', /^\/conversations\/([^/]+)\/messages$/, ({ params, body }) => {
  const user = requireUser();
  const id = parse(idSchema, params[0]);
  const { content } = parse(messageInputSchema, body);
  // Conversations the caller is not in look the same as ones that don't exist.
  const conversation = getState().conversations.find((c) => c.id === id && (c.student_id === user.id || c.landlord_id === user.id));
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  return { message: messageFromRow(addMessage(conversation, user.id, content)) };
});

export async function demoApi<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const url = new URL(path, 'http://demo.local');
  const query = Object.fromEntries(url.searchParams);
  for (const r of routes) {
    if (r.method !== method) continue;
    const match = r.pattern.exec(url.pathname);
    if (!match) continue;
    // Clone what goes out so callers can't change the stored rows by accident.
    const result = r.handler({ params: match.slice(1), query, body: options.body });
    return (result === undefined ? undefined : JSON.parse(JSON.stringify(result))) as T;
  }
  throw new ApiError(404, 'Not found');
}
