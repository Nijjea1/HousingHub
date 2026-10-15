/** What the API needs from the outside world. Production passes Supabase-backed versions; tests pass fakes. */
import type {
  Conversation,
  Coordinates,
  Listing,
  ListingInput,
  Message,
  SearchParams,
  SearchResult,
} from "../shared/schema.js";

export interface AuthUser {
  id: string;
}

/** Listing storage as seen by one caller. Writes only succeed on the caller's own rows. */
export interface ListingStore {
  /** Available listings matching the search, in the order it asks for. */
  search(params: SearchParams): Promise<SearchResult[]>;
  /** Every listing the user owns, including unavailable ones. */
  listByOwner(userId: string): Promise<Listing[]>;
  get(id: string): Promise<Listing | null>;
  create(userId: string, input: ListingInput): Promise<Listing>;
  /** Returns null when the listing doesn't exist or isn't the caller's. */
  update(id: string, input: ListingInput): Promise<Listing | null>;
  /** Returns false when the listing doesn't exist or isn't the caller's. */
  remove(id: string): Promise<boolean>;
}

/** Conversations and messages as seen by one caller. Only participants see or write them. */
export interface MessageStore {
  /** null when it doesn't exist or the caller isn't in it. */
  getConversation(id: string): Promise<Conversation | null>;
  findConversation(listingId: string, studentId: string): Promise<Conversation | null>;
  /** Fails unless the caller is the student and landlordId owns the listing. */
  createConversation(input: { listingId: string; studentId: string; landlordId: string }): Promise<Conversation>;
  send(conversation: Conversation, senderId: string, content: string): Promise<Message>;
  /** Unread messages addressed to receiverId in this conversation. */
  unreadCount(conversationId: string, receiverId: string): Promise<number>;
}

export interface NewMessageNotice {
  conversationId: string;
  listingId: string;
  senderId: string;
  receiverId: string;
  content: string;
}

export type AddressQuery = Pick<ListingInput, "address" | "city" | "province">;

export interface AppDeps {
  /** Returns the user a JWT belongs to, or null if it is invalid or expired. */
  verifyToken(token: string): Promise<AuthUser | null>;
  /** Storage that acts as the caller, so row level security still applies. */
  listingsFor(token: string | null): ListingStore;
  /** Returns null when the address can't be found or the provider fails. */
  geocode(address: AddressQuery): Promise<Coordinates | null>;
  messagesFor(token: string | null): MessageStore;
  /** Emails the receiver if they're away. Left out when email isn't configured. */
  notifyNewMessage?(notice: NewMessageNotice): Promise<unknown>;
  limits?: { readsPerMinute: number; writesPerMinute: number };
  now?: () => number;
}

declare global {
  namespace Express {
    interface Locals {
      user?: AuthUser;
      token?: string;
    }
  }
}
