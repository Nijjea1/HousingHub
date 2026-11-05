/** /api/conversations: start a conversation about a listing and send messages in it. */
import { asc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { inboxEntryFromRow, messageFromRecord, type InboxRow } from "../shared/mappers.js";
import { messageInputSchema, startConversationSchema, type Conversation, type Message } from "../shared/schema.js";
import { requireUser } from "./auth.js";
import { asUser, rowsOf } from "./db/client.js";
import { conversations, messages } from "./db/schema.js";
import { dbOf, guard } from "./db/use.js";
import type { AppDeps, MessageStore } from "./deps.js";
import { HttpError, asyncHandler, parseInput } from "./http.js";
import { rateLimit } from "./rate-limit.js";

const idSchema = z.string().uuid("Not a valid conversation id");

export function conversationsRouter(deps: AppDeps) {
  const router = Router();
  const limits = deps.limits ?? { readsPerMinute: 120, writesPerMinute: 20 };
  const writeLimit = rateLimit({ limit: limits.writesPerMinute, windowMs: 60_000, now: deps.now });

  /**
   * Emails the receiver only for the first unread message in the conversation, so a burst of
   * messages sends one email. Email problems never fail the send.
   */
  const notify = async (store: MessageStore, conversation: Conversation, message: Message) => {
    if (!deps.notifyNewMessage) return;
    try {
      if ((await store.unreadCount(conversation.id, message.receiverId)) !== 1) return;
      await deps.notifyNewMessage({
        conversationId: conversation.id,
        listingId: conversation.listingId,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
      });
    } catch (err) {
      console.warn("Message notification failed:", err instanceof Error ? err.message : err);
    }
  };

  const readLimit = rateLimit({ limit: limits.readsPerMinute, windowMs: 60_000, now: deps.now });

  // The caller's inbox: one entry per conversation with the other person, last message and unread count.
  router.get(
    "/",
    requireUser,
    readLimit,
    asyncHandler(async (_req, res) => {
      const me = res.locals.user!.id;
      const result = await guard(() =>
        asUser(dbOf(deps), me, (tx) => tx.execute(sql`select to_jsonb(t) as entry from public.my_conversations() t`)),
      );
      res.json({ conversations: rowsOf<{ entry: InboxRow }>(result).map((r) => inboxEntryFromRow(r.entry)) });
    }),
  );

  router.get(
    "/:id/messages",
    requireUser,
    readLimit,
    asyncHandler(async (req, res) => {
      const id = parseInput(idSchema, req.params.id);
      const me = res.locals.user!.id;
      const rows = await guard(() =>
        asUser(dbOf(deps), me, async (tx) => {
          // RLS hides conversations the caller isn't in, so "not yours" and "doesn't exist" look the same.
          const [conversation] = await tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.id, id));
          if (!conversation) throw new HttpError(404, "Conversation not found");
          return tx.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
        }),
      );
      res.json({ messages: rows.map((m) => messageFromRecord({ ...m, conversationId: id })) });
    }),
  );

  router.post(
    "/",
    requireUser,
    writeLimit,
    asyncHandler(async (req, res) => {
      const { listingId, content } = parseInput(startConversationSchema, req.body);
      const me = res.locals.user!.id;
      const listing = await deps.listingsFor(res.locals.token ?? null).get(listingId);
      if (!listing) throw new HttpError(404, "Listing not found");
      if (listing.userId === me) throw new HttpError(400, "This is your own listing");

      const store = deps.messagesFor(res.locals.token ?? null);
      const conversation =
        (await store.findConversation(listingId, me)) ??
        (await store.createConversation({ listingId, studentId: me, landlordId: listing.userId }));
      const message = await store.send(conversation, me, content);
      await notify(store, conversation, message);
      res.status(201).json({ conversation, message });
    }),
  );

  router.post(
    "/:id/messages",
    requireUser,
    writeLimit,
    asyncHandler(async (req, res) => {
      const id = parseInput(idSchema, req.params.id);
      const { content } = parseInput(messageInputSchema, req.body);
      const store = deps.messagesFor(res.locals.token ?? null);
      // RLS hides conversations the caller isn't in, so "not yours" and "doesn't exist" look the same.
      const conversation = await store.getConversation(id);
      if (!conversation) throw new HttpError(404, "Conversation not found");
      const message = await store.send(conversation, res.locals.user!.id, content);
      await notify(store, conversation, message);
      res.status(201).json({ message });
    }),
  );

  return router;
}
