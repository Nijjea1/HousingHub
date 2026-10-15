/** Production dependencies: Supabase as the caller (so RLS applies) and the Nominatim geocoder. */
import { createClient } from "@supabase/supabase-js";
import {
  conversationFromRow,
  listingFromRow,
  messageFromRow,
  newMessageRow,
  listingToRow,
  searchResultFromRow,
  searchToArgs,
  type ConversationRow,
  type ListingRow,
  type MessageRow,
  type SearchResultRow,
} from "../shared/mappers.js";
import type { AppDeps, ListingStore, MessageStore } from "./deps.js";
import { cacheVerifiedTokens } from "./auth.js";
import { createNominatimGeocoder } from "./geocode.js";
import { createEmailNotifier, type NotifyLookup } from "./notify.js";

export function createSupabaseDeps(env: NodeJS.ProcessEnv = process.env): AppDeps {
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");

  const newClient = (token: string | null) =>
    createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    });
  const anon = newClient(null);
  // Signed-out requests share one client; a signed-in caller needs their own token in the headers.
  const clientFor = (token: string | null) => (token ? newClient(token) : anon);

  const listingsFor = (token: string | null): ListingStore => {
    const db = clientFor(token);
    const rows = (data: unknown) => (data as ListingRow[]).map(listingFromRow);
    return {
      async search(params) {
        const { data, error } = await db.rpc("search_listings", searchToArgs(params));
        if (error) throw error;
        return (data as SearchResultRow[]).map(searchResultFromRow);
      },
      async listByOwner(userId) {
        const { data, error } = await db
          .from("listings")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return rows(data);
      },
      async get(id) {
        const { data, error } = await db.from("listings").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return data ? listingFromRow(data as ListingRow) : null;
      },
      async create(userId, input) {
        const { data, error } = await db
          .from("listings")
          .insert({ ...listingToRow(input), user_id: userId })
          .select()
          .single();
        if (error) throw error;
        return listingFromRow(data as ListingRow);
      },
      // RLS turns a write on someone else's row into zero rows, which comes back as null / false.
      async update(id, input) {
        const { data, error } = await db.from("listings").update(listingToRow(input)).eq("id", id).select().maybeSingle();
        if (error) throw error;
        return data ? listingFromRow(data as ListingRow) : null;
      },
      async remove(id) {
        const { data, error } = await db.from("listings").delete().eq("id", id).select("id");
        if (error) throw error;
        return data.length > 0;
      },
    };
  };

  const messagesFor = (token: string | null): MessageStore => {
    const db = clientFor(token);
    const conversation = (data: unknown) => (data ? conversationFromRow(data as ConversationRow) : null);
    const findConversation = async (listingId: string, studentId: string) => {
      const { data, error } = await db
        .from("conversations")
        .select("*")
        .eq("listing_id", listingId)
        .eq("student_id", studentId)
        .maybeSingle();
      if (error) throw error;
      return conversation(data);
    };
    return {
      async getConversation(id) {
        const { data, error } = await db.from("conversations").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return conversation(data);
      },
      findConversation,
      async createConversation({ listingId, studentId, landlordId }) {
        const { data, error } = await db
          .from("conversations")
          .insert({ listing_id: listingId, student_id: studentId, landlord_id: landlordId })
          .select()
          .single();
        // Two requests racing to start the same conversation: the loser reads the winner's row.
        if (error?.code === "23505") {
          const existing = await findConversation(listingId, studentId);
          if (existing) return existing;
        }
        if (error) throw error;
        return conversationFromRow(data as ConversationRow);
      },
      async send(c, senderId, content) {
        const { data, error } = await db.from("messages").insert(newMessageRow(c, senderId, content)).select().single();
        if (error) throw error;
        return messageFromRow(data as MessageRow);
      },
      async unreadCount(conversationId, receiverId) {
        const { count, error } = await db
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversationId)
          .eq("receiver_id", receiverId)
          .eq("is_read", false);
        if (error) throw error;
        return count ?? 0;
      },
    };
  };

  return {
    verifyToken: cacheVerifiedTokens(async (token) => {
      const { data, error } = await anon.auth.getUser(token);
      return error || !data.user ? null : { id: data.user.id };
    }),
    listingsFor,
    messagesFor,
    notifyNewMessage: createNotifier(env, url),
    geocode: createNominatimGeocoder({ userAgent: env.GEOCODER_USER_AGENT ?? "LetMeKnock/0.2 (student housing)" }),
  };
}

/**
 * Offline message emails need the service role key (to read the receiver's email and last-seen time,
 * which RLS keeps from other users) and Resend settings. Without them, emails are off.
 */
function createNotifier(env: NodeJS.ProcessEnv, url: string) {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = env.RESEND_API_KEY;
  const from = env.NOTIFY_FROM_EMAIL;
  const appUrl = env.APP_URL;
  if (!serviceKey || !resendApiKey || !from || !appUrl) {
    console.warn("Offline message emails are off: set SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, NOTIFY_FROM_EMAIL and APP_URL.");
    return undefined;
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const one = async <T>(query: PromiseLike<{ data: T | null; error: unknown }>) => {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };
  const lookup: NotifyLookup = {
    lastSeenAt: async (userId) =>
      (await one<{ last_seen_at: string }>(admin.from("user_presence").select("last_seen_at").eq("user_id", userId).maybeSingle()))?.last_seen_at ?? null,
    email: async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw error;
      return data.user?.email ?? null;
    },
    displayName: async (userId) =>
      (await one<{ full_name: string | null }>(admin.from("profiles").select("full_name").eq("id", userId).maybeSingle()))?.full_name ?? null,
    listingTitle: async (listingId) =>
      (await one<{ title: string }>(admin.from("listings").select("title").eq("id", listingId).maybeSingle()))?.title ?? null,
  };
  return createEmailNotifier({ lookup, resendApiKey, from, appUrl });
}
