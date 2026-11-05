/** The demo's database: the seeded tables in memory, saved to localStorage so a visitor's changes survive a reload. */
import { DEMO_PASSWORD } from '@shared/demo';
import type {
  ConversationRow,
  FavoriteRow,
  ListingRow,
  MessageRow,
  PreferencesRow,
  ProfileRow,
  UniversityRow,
} from '@shared/mappers';
import type { Review, SavedSearch, ViewingRequest } from '@shared/schema';
import seed from './seed.json';

export const STORAGE_KEY = 'letmeknock-demo-v1';

export interface DemoUser {
  id: string;
  email: string;
  /** null for the two seeded accounts, which sign in with the published demo password. */
  passwordHash: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DemoState {
  users: DemoUser[];
  universities: UniversityRow[];
  profiles: ProfileRow[];
  user_preferences: PreferencesRow[];
  listings: ListingRow[];
  favorites: FavoriteRow[];
  conversations: ConversationRow[];
  messages: MessageRow[];
  saved_searches: SavedSearch[];
  viewing_requests: ViewingRequest[];
  reviews: Review[];
  sessionUserId: string | null;
}

type Listener = () => void;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function initial(): DemoState {
  const data = clone(seed) as unknown as {
    universities: UniversityRow[];
    users: Array<{ id: string; email: string; created_at: string }>;
    profiles: ProfileRow[];
    listings: ListingRow[];
    favorites: FavoriteRow[];
    conversations: ConversationRow[];
    messages: MessageRow[];
  };
  return {
    users: data.users.map((u) => ({
      id: u.id,
      email: u.email,
      passwordHash: null,
      metadata: { full_name: data.profiles.find((p) => p.id === u.id)?.full_name ?? null },
      createdAt: u.created_at,
    })),
    universities: data.universities,
    profiles: data.profiles,
    user_preferences: [],
    listings: data.listings,
    favorites: data.favorites,
    conversations: data.conversations,
    messages: data.messages,
    saved_searches: [],
    viewing_requests: [],
    reviews: [],
    sessionUserId: null,
  };
}

let state: DemoState | null = null;
const listeners = new Set<Listener>();

function readStored(): DemoState | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoState) : null;
  } catch {
    return null;
  }
}

function persist() {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private windows and full storage still work: the demo just won't survive a reload.
  }
}

export function getState(): DemoState {
  state ??= readStored() ?? initial();
  return state;
}

/** Changes the state, saves it and tells subscribers. Every write goes through here. */
export function mutate<T>(change: (s: DemoState) => T): T {
  const result = change(getState());
  persist();
  listeners.forEach((l) => l());
  return result;
}

/** Back to the seeded data, signed out. */
export function resetDemo() {
  state = initial();
  persist();
  listeners.forEach((l) => l());
}

/** Forgets the in-memory copy so the next read comes from storage, like a page reload. */
export function reloadFromStorage() {
  state = null;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

/** Passwords are hashed so a real one typed into the demo is not sitting in storage as text. */
export async function hashPassword(email: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function passwordMatches(user: DemoUser, password: string): Promise<boolean> {
  if (user.passwordHash === null) return password === DEMO_PASSWORD;
  return user.passwordHash === (await hashPassword(user.email, password));
}

export const currentUser = (s: DemoState = getState()): DemoUser | null => s.users.find((u) => u.id === s.sessionUserId) ?? null;

export interface RowEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
}

const rowListeners = new Set<(event: RowEvent) => void>();

/** What Supabase Realtime would push: a row changed. Only tabs in this browser hear it. */
export function emitRowEvent(event: RowEvent) {
  rowListeners.forEach((l) => l(event));
}

export function onRowEvent(listener: (event: RowEvent) => void): () => void {
  rowListeners.add(listener);
  return () => rowListeners.delete(listener);
}
