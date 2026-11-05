/** Socket.IO service: a room per conversation, live messages, read receipts, unread counts and notifications. */
import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { Server } from "socket.io";
import type { ZodTypeAny, z } from "zod";
import { messageFromRecord } from "../shared/mappers.js";
import {
  joinConversationSchema,
  markReadSchema,
  publishedEventSchema,
  sendMessageSchema,
  typingSchema,
  type Ack,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "../shared/realtime.js";
import { asUser, type Db, type Tx } from "../server/db/client.js";
import { conversations, messages } from "../server/db/schema.js";
import type { AuthUser, NewMessageNotice } from "../server/deps.js";
import { createRateLimiter } from "../server/rate-limit.js";

export interface RealtimeDeps {
  /** Returns the user a Supabase JWT belongs to, or null. */
  verifyToken(token: string): Promise<AuthUser | null>;
  db: Db;
  /** Emails the receiver when they have no open connection. Left out when email isn't configured. */
  notifyOffline?: (notice: NewMessageNotice) => Promise<unknown>;
  /** Shared with the API, which posts events to /notify. Without it /notify answers 503. */
  notifySecret?: string;
  /** Browser origins allowed to connect. */
  allowedOrigins?: string[];
  /** Messages one user may send per 10 seconds. */
  sendLimit?: number;
}

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, object, { userId: string }>;

export const userRoom = (userId: string) => `user:${userId}`;
export const conversationRoom = (conversationId: string) => `conv:${conversationId}`;

class Refusal extends Error {}

const sameSecret = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function totalUnread(tx: Tx, userId: string): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false), isNotNull(messages.conversationId)));
  return row.n;
}

export function createRealtimeServer(deps: RealtimeDeps, httpServer?: HttpServer) {
  const server = httpServer ?? createServer(handleHttp);
  const io: IoServer = new Server(server, {
    cors: { origin: deps.allowedOrigins ?? false },
  });
  const sendLimiter = createRateLimiter({ limit: deps.sendLimit ?? 30, windowMs: 10_000 });

  function handleHttp(req: IncomingMessage, res: ServerResponse) {
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (req.method === "GET" && req.url === "/health") return reply(200, { ok: true });

    if (req.method === "POST" && req.url === "/notify") {
      if (!deps.notifySecret) return reply(503, { error: "Notifications are not configured" });
      const sent = req.headers["x-notify-secret"];
      if (typeof sent !== "string" || !sameSecret(sent, deps.notifySecret)) return reply(401, { error: "Unauthorized" });

      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
        if (raw.length > 100_000) req.destroy();
      });
      req.on("end", () => {
        let parsed: z.SafeParseReturnType<unknown, z.infer<typeof publishedEventSchema>>;
        try {
          parsed = publishedEventSchema.safeParse(JSON.parse(raw));
        } catch {
          return reply(400, { error: "Invalid JSON" });
        }
        if (!parsed.success) return reply(400, { error: "Invalid event" });
        io.to(userRoom(parsed.data.userId)).emit("notification", {
          type: parsed.data.type,
          payload: parsed.data.payload,
          at: new Date().toISOString(),
        });
        reply(202, { ok: true });
      });
      return;
    }

    reply(404, { error: "Not found" });
  }

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = typeof token === "string" ? await deps.verifyToken(token).catch(() => null) : null;
    if (!user) return next(new Error("Sign in required"));
    socket.data.userId = user.id;
    next();
  });

  /** Runs a handler with validated input and turns failures into an ack instead of a crash. */
  function on<S extends ZodTypeAny, R extends object>(
    schema: S,
    run: (input: z.output<S>) => Promise<R>,
  ): (input: unknown, ack?: (r: Ack<R>) => void) => void {
    return (input, ack) => {
      const done = (r: Ack<R>) => typeof ack === "function" && ack(r);
      const parsed = schema.safeParse(input);
      if (!parsed.success) return done({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
      run(parsed.data).then(
        (result) => done({ ok: true, ...result }),
        (err) => {
          if (!(err instanceof Refusal)) console.error("Realtime handler failed:", err);
          done({ ok: false, error: err instanceof Refusal ? err.message : "Something went wrong" });
        },
      );
    };
  }

  io.on("connection", (socket) => {
    const me = socket.data.userId;
    socket.join(userRoom(me));

    // Join every conversation the user is in, then tell them what they've missed.
    asUser(deps.db, me, async (tx) => ({
      rooms: await tx.select({ id: conversations.id }).from(conversations),
      total: await totalUnread(tx, me),
    })).then(
      ({ rooms, total }) => {
        for (const { id } of rooms) socket.join(conversationRoom(id));
        socket.emit("unread:update", { conversationId: null, unreadCount: 0, total });
      },
      (err) => console.error("Realtime connect failed:", err),
    );

    socket.on(
      "conversation:join",
      on(joinConversationSchema, async ({ conversationId }) => {
        // RLS only returns conversations the caller is in.
        const [found] = await asUser(deps.db, me, (tx) =>
          tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.id, conversationId)),
        );
        if (!found) throw new Refusal("Conversation not found");
        socket.join(conversationRoom(conversationId));
        return {};
      }),
    );

    socket.on(
      "message:send",
      on(sendMessageSchema, async ({ conversationId, content }) => {
        if (!sendLimiter(me).allowed) throw new Refusal("You're sending messages too fast");

        const sent = await asUser(deps.db, me, async (tx) => {
          const [conversation] = await tx.select().from(conversations).where(eq(conversations.id, conversationId));
          if (!conversation) throw new Refusal("Conversation not found");
          const receiverId = conversation.studentId === me ? conversation.landlordId : conversation.studentId;
          const [row] = await tx
            .insert(messages)
            .values({ conversationId, senderId: me, receiverId, listingId: conversation.listingId, content })
            .returning();
          const [{ n }] = await tx
            .select({ n: sql<number>`count(*)::int` })
            .from(messages)
            .where(and(eq(messages.conversationId, conversationId), eq(messages.receiverId, receiverId), eq(messages.isRead, false)));
          return { row, receiverId, unreadInConversation: n };
        });
        // After the transaction closes: the connection pool has one connection, so a nested query would wait on itself.
        const receiverTotal = await totalUnreadFor(sent.receiverId);

        const message = messageFromRecord({ ...sent.row, conversationId });
        // A conversation that was just started has no room members yet; make sure both people are in it.
        io.in([userRoom(me), userRoom(sent.receiverId)]).socketsJoin(conversationRoom(conversationId));
        io.to(conversationRoom(conversationId)).emit("message:new", message);
        io.to(userRoom(sent.receiverId)).emit("unread:update", {
          conversationId,
          unreadCount: sent.unreadInConversation,
          total: receiverTotal,
        });

        // Only the first unread message in a burst sends an email, and only to someone with no open tab.
        if (deps.notifyOffline && sent.unreadInConversation === 1 && (await io.in(userRoom(sent.receiverId)).fetchSockets()).length === 0) {
          deps
            .notifyOffline({ conversationId, listingId: message.listingId, senderId: me, receiverId: sent.receiverId, content })
            .catch((err) => console.warn("Message notification failed:", err instanceof Error ? err.message : err));
        }
        return { message };
      }),
    );

    socket.on(
      "message:read",
      on(markReadSchema, async ({ conversationId }) => {
        const { ids, total } = await asUser(deps.db, me, async (tx) => {
          const updated = await tx
            .update(messages)
            .set({ isRead: true })
            .where(and(eq(messages.conversationId, conversationId), eq(messages.receiverId, me), eq(messages.isRead, false)))
            .returning({ id: messages.id });
          return { ids: updated.map((m) => m.id), total: await totalUnread(tx, me) };
        });
        if (ids.length > 0) {
          io.to(conversationRoom(conversationId)).emit("message:read", { conversationId, readerId: me, messageIds: ids });
          io.to(userRoom(me)).emit("unread:update", { conversationId, unreadCount: 0, total });
        }
        return { messageIds: ids };
      }),
    );

    socket.on("typing", (input) => {
      const parsed = typingSchema.safeParse(input);
      if (!parsed.success || !socket.rooms.has(conversationRoom(parsed.data.conversationId))) return;
      socket.to(conversationRoom(parsed.data.conversationId)).emit("typing", { ...parsed.data, userId: me });
    });
  });

  /** The receiver's unread total, read as the receiver so it matches what they'll see. */
  async function totalUnreadFor(userId: string) {
    return asUser(deps.db, userId, (tx) => totalUnread(tx, userId));
  }

  return {
    io,
    server,
    close: () => new Promise<void>((resolve) => io.close(() => resolve())),
  };
}
