/**
 * A stand-in for the Supabase client, over the demo store. It covers what the app calls (see the hooks in
 * client/src/hooks and client/src/lib/storage.ts) and nothing more, with the same result shapes: { data, error, count }.
 */
import type { InboxRow, ListingRow, MessageRow } from '@shared/mappers';
import { MIN_PASSWORD_LENGTH } from '@shared/schema';
import {
  currentUser,
  getState,
  hashPassword,
  mutate,
  newId,
  nowIso,
  onRowEvent,
  passwordMatches,
  emitRowEvent,
  type DemoUser,
} from './store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
interface DemoError {
  message: string;
  code?: string;
}
interface Result {
  data: unknown;
  error: DemoError | null;
  count?: number | null;
}

/** Rows the app never needs to keep between visits. */
const presence: Row[] = [];

const TABLES = ['universities', 'profiles', 'user_preferences', 'listings', 'favorites', 'conversations', 'messages'] as const;
const PRIMARY_KEY: Record<string, string> = { user_preferences: 'user_id', user_presence: 'user_id' };
const WITH_ID_AND_CREATED_AT = new Set(['favorites', 'messages', 'conversations']);

function tableRows(name: string): Row[] {
  if (name === 'user_presence') return presence;
  if (!(TABLES as readonly string[]).includes(name)) throw new Error(`The demo has no table "${name}"`);
  return getState()[name as (typeof TABLES)[number]] as unknown as Row[];
}

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

class Builder implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: Row | Row[] = {};
  private returning = false;
  private cols = '*';
  private countMode = false;
  private head = false;
  private filters: Array<(row: Row) => boolean> = [];
  private sort: { column: string; ascending: boolean } | null = null;
  private mode: 'many' | 'one' | 'maybe' = 'many';
  private conflict: string[] | null = null;

  constructor(private table: string) {}

  select(columns = '*', options: { count?: 'exact'; head?: boolean } = {}) {
    this.cols = columns;
    if (this.op === 'select') {
      this.countMode = options.count === 'exact';
      this.head = options.head === true;
    } else {
      this.returning = true;
    }
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = 'insert';
    this.payload = values;
    return this;
  }
  upsert(values: Row | Row[], options: { onConflict?: string } = {}) {
    this.op = 'upsert';
    this.payload = values;
    this.conflict = options.onConflict ? options.onConflict.split(',').map((c) => c.trim()) : null;
    return this;
  }
  update(values: Row) {
    this.op = 'update';
    this.payload = values;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  /** Only `.not(column, 'is', value)`, the one form the app uses. */
  not(column: string, operator: string, value: unknown) {
    if (operator !== 'is') throw new Error(`The demo does not support not(${operator})`);
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.sort = { column, ascending: options.ascending ?? true };
    return this;
  }
  single() {
    this.mode = 'one';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybe';
    return this;
  }

  then<A = Result, B = never>(onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null, onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }

  private run(): Result {
    try {
      return this.execute();
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : String(err) } };
    }
  }

  /** `*` plus any `alias:table(*)` embed, e.g. `*, listing:listings(*)`. */
  private shape(row: Row): Row {
    const out = copy(row);
    const embed = /(\w+):(\w+)\(\*\)/.exec(this.cols);
    if (embed) {
      const [, alias, table] = embed;
      const targetId = row[`${alias}_id`];
      out[alias] = copy(tableRows(table).find((r) => r.id === targetId) ?? null);
    }
    return out;
  }

  private respond(rows: Row[]): Result {
    const data = rows.map((r) => this.shape(r));
    if (this.mode === 'one') {
      if (data.length !== 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
      return { data: data[0], error: null };
    }
    if (this.mode === 'maybe') {
      if (data.length > 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
      return { data: data[0] ?? null, error: null };
    }
    return { data, error: null };
  }

  private matching(): Row[] {
    return tableRows(this.table).filter((row) => this.filters.every((f) => f(row)));
  }

  private withDefaults(row: Row): Row {
    const out: Row = { ...row };
    if (WITH_ID_AND_CREATED_AT.has(this.table)) {
      out.id ??= newId();
      out.created_at ??= nowIso();
    }
    if (this.table === 'favorites') {
      out.note ??= null;
      out.collection_name ??= null;
    }
    if (this.table === 'messages') out.is_read ??= false;
    return out;
  }

  private conflictColumns(): string[] {
    return this.conflict ?? [PRIMARY_KEY[this.table] ?? 'id'];
  }

  private emit(eventType: 'INSERT' | 'UPDATE', row: Row) {
    if (this.table === 'messages') emitRowEvent({ table: 'messages', eventType, new: copy(row) });
  }

  private execute(): Result {
    const rows = tableRows(this.table);
    const list = Array.isArray(this.payload) ? this.payload : [this.payload];

    switch (this.op) {
      case 'select': {
        let found = this.matching();
        const sort = this.sort;
        if (sort) {
          found = [...found].sort((a, b) => {
            const x = a[sort.column];
            const y = b[sort.column];
            const order = x < y ? -1 : x > y ? 1 : 0;
            return sort.ascending ? order : -order;
          });
        }
        if (this.head) return { data: null, error: null, count: found.length };
        return { ...this.respond(found), count: this.countMode ? found.length : null };
      }

      case 'insert': {
        const added: Row[] = [];
        for (const values of list) {
          const row = this.withDefaults(values);
          if (this.table === 'favorites' && rows.some((r) => r.user_id === row.user_id && r.listing_id === row.listing_id)) {
            return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
          }
          added.push(row);
        }
        mutate(() => rows.push(...added));
        added.forEach((r) => this.emit('INSERT', r));
        return this.returning ? this.respond(added) : { data: null, error: null };
      }

      case 'upsert': {
        const touched: Row[] = [];
        const columns = this.conflictColumns();
        mutate(() => {
          for (const values of list) {
            const existing = rows.find((r) => columns.every((c) => r[c] === values[c]));
            if (existing) {
              Object.assign(existing, values);
              touched.push(existing);
            } else {
              const row = this.withDefaults(values);
              rows.push(row);
              touched.push(row);
            }
          }
        });
        return this.returning ? this.respond(touched) : { data: null, error: null };
      }

      case 'update': {
        const found = this.matching();
        mutate(() => found.forEach((r) => Object.assign(r, this.payload)));
        found.forEach((r) => this.emit('UPDATE', r));
        return this.returning ? this.respond(found) : { data: null, error: null };
      }

      case 'delete': {
        const gone = new Set(this.matching());
        mutate(() => {
          for (let i = rows.length - 1; i >= 0; i--) if (gone.has(rows[i])) rows.splice(i, 1);
        });
        return this.returning ? this.respond([...gone]) : { data: null, error: null };
      }
    }
  }
}

/** The inbox, as the my_conversations() function builds it: one entry per conversation the caller is in. */
function myConversations(): InboxRow[] {
  const user = currentUser();
  if (!user) return [];
  const s = getState();
  return s.conversations
    .filter((c) => c.student_id === user.id || c.landlord_id === user.id)
    .map((c) => {
      const listing = s.listings.find((l) => l.id === c.listing_id) as ListingRow;
      const otherId = c.student_id === user.id ? c.landlord_id : c.student_id;
      const other = s.profiles.find((p) => p.id === otherId);
      const thread = s.messages.filter((m) => m.conversation_id === c.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = thread[thread.length - 1];
      return {
        id: c.id,
        listing_id: c.listing_id,
        listing_title: listing?.title ?? '',
        listing_image: listing?.images[0] ?? null,
        other_user_id: otherId,
        other_name: other?.full_name ?? null,
        other_avatar_url: other?.avatar_url ?? null,
        last_message: last?.content ?? null,
        last_sender_id: last?.sender_id ?? null,
        last_message_at: c.last_message_at,
        unread_count: thread.filter((m) => m.receiver_id === user.id && !m.is_read).length,
      };
    })
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

// Auth

type AuthListener = (event: string, session: unknown) => void;
const authListeners = new Set<AuthListener>();

const toUser = (u: DemoUser) => ({
  id: u.id,
  email: u.email,
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: u.metadata,
  created_at: u.createdAt,
});

function currentSession() {
  const user = currentUser();
  return user ? { access_token: 'demo-token', token_type: 'bearer', user: toUser(user) } : null;
}

const announce = (event: string) => authListeners.forEach((l) => l(event, currentSession()));

const auth = {
  async getSession() {
    return { data: { session: currentSession() }, error: null };
  },

  onAuthStateChange(callback: AuthListener) {
    authListeners.add(callback);
    // Supabase reports the starting session right away.
    Promise.resolve().then(() => callback('INITIAL_SESSION', currentSession()));
    return { data: { subscription: { unsubscribe: () => void authListeners.delete(callback) } } };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const user = getState().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !(await passwordMatches(user, password))) {
      return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
    }
    mutate((s) => void (s.sessionUserId = user.id));
    announce('SIGNED_IN');
    return { data: { user: toUser(user), session: currentSession() }, error: null };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Row } }) {
    const address = email.trim().toLowerCase();
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { data: { user: null, session: null }, error: { message: `Password should be at least ${MIN_PASSWORD_LENGTH} characters` } };
    }
    if (getState().users.some((u) => u.email.toLowerCase() === address)) {
      return { data: { user: null, session: null }, error: { message: 'User already registered' } };
    }
    const metadata = options?.data ?? {};
    const user: DemoUser = { id: newId(), email: address, passwordHash: await hashPassword(address, password), metadata, createdAt: nowIso() };
    // What the sign-up trigger does in the database: a profile from the metadata, ignoring an unknown university.
    const universityKnown = getState().universities.some((u) => u.id === metadata.university_id);
    mutate((s) => {
      s.users.push(user);
      s.profiles.push({
        id: user.id,
        full_name: (metadata.full_name as string) ?? null,
        university_id: universityKnown ? (metadata.university_id as string) : null,
        avatar_url: null,
        role: metadata.role === 'landlord' ? 'landlord' : 'student',
        created_at: user.createdAt,
      });
      s.sessionUserId = user.id;
    });
    announce('SIGNED_IN');
    return { data: { user: toUser(user), session: currentSession() }, error: null };
  },

  async signOut() {
    mutate((s) => void (s.sessionUserId = null));
    announce('SIGNED_OUT');
    return { error: null };
  },
};

// Realtime: only this browser can hear it, which is all a demo has to offer.

interface ChannelHandler {
  filter: { event?: string; schema?: string; table?: string };
  callback: (payload: Row) => void;
}

function channel(_name: string) {
  const handlers: ChannelHandler[] = [];
  let stop: (() => void) | null = null;
  const api = {
    on(_type: string, filter: ChannelHandler['filter'], callback: ChannelHandler['callback']) {
      handlers.push({ filter, callback });
      return api;
    },
    subscribe() {
      stop = onRowEvent((event) => {
        const me = currentUser()?.id;
        const row = event.new as Partial<MessageRow>;
        // Like the messages policy: you only hear about messages you sent or received.
        if (event.table === 'messages' && row.sender_id !== me && row.receiver_id !== me) return;
        for (const h of handlers) {
          if (h.filter.table !== event.table) continue;
          if (h.filter.event && h.filter.event !== '*' && h.filter.event !== event.eventType) continue;
          h.callback({ eventType: event.eventType, schema: 'public', table: event.table, new: event.new, old: {} });
        }
      });
      return api;
    },
    unsubscribe() {
      stop?.();
      stop = null;
    },
  };
  return api;
}

// Storage: pictures become data URLs, scaled down in the browser so a few of them fit in localStorage.

const MAX_SIDE = 1280;

async function toDataUrl(file: File): Promise<string> {
  try {
    if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    }
  } catch {
    // Fall through to the plain data URL.
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${file.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

const files = new Map<string, string>();

const storage = {
  from: (bucket: string) => ({
    async upload(path: string, file: File) {
      files.set(`${bucket}/${path}`, await toDataUrl(file));
      return { data: { path }, error: null };
    },
    getPublicUrl: (path: string) => ({ data: { publicUrl: files.get(`${bucket}/${path}`) ?? '' } }),
    async remove(paths: string[]) {
      paths.forEach((p) => files.delete(`${bucket}/${p}`));
      return { data: [], error: null };
    },
  }),
};

export const demoSupabase = {
  from: (table: string) => new Builder(table),
  async rpc(name: string): Promise<Result> {
    if (name === 'my_conversations') return { data: myConversations(), error: null };
    return { data: null, error: { message: `The demo has no function "${name}"` } };
  },
  auth,
  channel,
  removeChannel: (ch: { unsubscribe: () => void }) => ch.unsubscribe(),
  storage,
};
