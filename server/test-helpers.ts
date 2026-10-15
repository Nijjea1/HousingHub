/** Starts the API on a random port with fake dependencies, for tests. */
import type { AddressInfo } from "node:net";
import type { Conversation, Listing, ListingInput, Message } from "@shared/schema";
import { searchInMemory } from "@shared/search";
import { createApp } from "./app";
import type { AppDeps, ListingStore, MessageStore, NewMessageNotice } from "./deps";

export const TOKENS = {
  landlord: { token: "token-landlord", id: "0a000000-0000-4000-8000-00000000000a" },
  other: { token: "token-other", id: "0b000000-0000-4000-8000-00000000000b" },
  student: { token: "token-student", id: "0c000000-0000-4000-8000-00000000000c" },
} as const;

const callerOf = (token: string | null) => Object.values(TOKENS).find((t) => t.token === token)?.id ?? null;
const fakeId = (prefix: string, n: number) => `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** In-memory listings. Like the real RLS policies, writes only touch the caller's own rows; search uses the same reference the SQL is tested against. */
export function createFakeListings() {
  const rows = new Map<string, Listing>();
  let counter = 0;

  const storeFor = (token: string | null): ListingStore => {
    const callerId = callerOf(token);
    const owned = (id: string) => {
      const row = rows.get(id);
      return row && row.userId === callerId ? row : null;
    };
    return {
      search: async (params) => searchInMemory([...rows.values()], params),
      listByOwner: async (userId) => [...rows.values()].filter((l) => l.userId === userId),
      get: async (id) => rows.get(id) ?? null,
      create: async (userId, input) => {
        counter += 1;
        const stamp = new Date(Date.UTC(2026, 8, 1, 0, 0, counter)).toISOString();
        const listing: Listing = {
          ...input,
          id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
          userId,
          createdAt: stamp,
          updatedAt: stamp,
        };
        rows.set(listing.id, listing);
        return listing;
      },
      update: async (id, input) => {
        const row = owned(id);
        if (!row) return null;
        const updated = { ...row, ...input, updatedAt: new Date().toISOString() };
        rows.set(id, updated);
        return updated;
      },
      remove: async (id) => (owned(id) ? rows.delete(id) : false),
    };
  };

  return { rows, storeFor };
}

/** In-memory conversations and messages with the same participant rules as the RLS policies. */
export function createFakeMessages(listings: Map<string, Listing>) {
  const conversations = new Map<string, Conversation>();
  const messages: Message[] = [];
  let counter = 0;
  const stamp = () => new Date(Date.UTC(2026, 9, 1, 0, 0, ++counter)).toISOString();
  const isIn = (c: Conversation, userId: string | null) => userId === c.studentId || userId === c.landlordId;

  const storeFor = (token: string | null): MessageStore => {
    const caller = callerOf(token);
    return {
      getConversation: async (id) => {
        const c = conversations.get(id);
        return c && isIn(c, caller) ? c : null;
      },
      findConversation: async (listingId, studentId) =>
        [...conversations.values()].find((c) => c.listingId === listingId && c.studentId === studentId && isIn(c, caller)) ??
        null,
      createConversation: async ({ listingId, studentId, landlordId }) => {
        if (caller !== studentId || listings.get(listingId)?.userId !== landlordId || studentId === landlordId) {
          throw new Error("new row violates row-level security policy");
        }
        const at = stamp();
        const c: Conversation = { id: fakeId("c", counter), listingId, studentId, landlordId, createdAt: at, lastMessageAt: at };
        conversations.set(c.id, c);
        return c;
      },
      send: async (c, senderId, content) => {
        if (caller !== senderId || !isIn(c, senderId)) throw new Error("new row violates row-level security policy");
        const m: Message = {
          id: fakeId("d", counter + 1),
          conversationId: c.id,
          senderId,
          receiverId: senderId === c.studentId ? c.landlordId : c.studentId,
          listingId: c.listingId,
          content,
          isRead: false,
          createdAt: stamp(),
        };
        messages.push(m);
        conversations.set(c.id, { ...c, lastMessageAt: m.createdAt });
        return m;
      },
      unreadCount: async (conversationId, receiverId) =>
        messages.filter((m) => m.conversationId === conversationId && m.receiverId === receiverId && !m.isRead).length,
    };
  };

  /** What the receiver's browser does when they open the conversation. */
  const markRead = (conversationId: string, receiverId: string) => {
    for (const m of messages) if (m.conversationId === conversationId && m.receiverId === receiverId) m.isRead = true;
  };

  return { conversations, messages, storeFor, markRead };
}

export async function startTestApi(overrides: Partial<AppDeps> = {}) {
  const listings = createFakeListings();
  const messages = createFakeMessages(listings.rows);
  const notices: NewMessageNotice[] = [];
  const geocodeCalls: Parameters<AppDeps["geocode"]>[0][] = [];
  const deps: AppDeps = {
    verifyToken: async (token) => {
      const match = Object.values(TOKENS).find((t) => t.token === token);
      return match ? { id: match.id } : null;
    },
    listingsFor: listings.storeFor,
    messagesFor: messages.storeFor,
    notifyNewMessage: async (notice) => {
      notices.push(notice);
    },
    geocode: async (address) => {
      geocodeCalls.push(address);
      return { latitude: 43.26, longitude: -79.92 };
    },
    ...overrides,
  };

  const server = createApp(deps).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  const request = (method: string, path: string, options: { token?: string; body?: unknown; rawBody?: string } = {}) =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.body !== undefined || options.rawBody !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.rawBody ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });

  return {
    request,
    listings,
    messages,
    notices,
    geocodeCalls,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export const validInput = (overrides: Partial<ListingInput> = {}): ListingInput => ({
  title: "Room near campus",
  description: "A bright room close to McMaster.",
  detailedDescription: null,
  price: 800,
  propertyType: "house",
  bedrooms: 3,
  bathrooms: 1,
  squareFeet: null,
  address: "Sterling St",
  neighborhood: null,
  city: "Hamilton",
  province: "ON",
  postalCode: "L8S 4H9",
  universityId: "mcmaster",
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
