import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { io as connect, type Socket } from "socket.io-client";
import type { Db } from "../../server/db/client";
import type { NewMessageNotice } from "../../server/deps";
import { createRealtimeServer } from "../../realtime/server";
import type { Ack, ClientToServerEvents, ServerToClientEvents } from "../../shared/realtime";
import type { Message } from "../../shared/schema";
import { createDb, migrate } from "./db.mjs";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const SECRET = "shared-secret";
const U = {
  student: { token: "t-student", id: "0c000000-0000-4000-8000-00000000000c" },
  landlord: { token: "t-landlord", id: "0a000000-0000-4000-8000-00000000000a" },
  outsider: { token: "t-outsider", id: "0b000000-0000-4000-8000-00000000000b" },
};

let pg: PGlite;
let service: ReturnType<typeof createRealtimeServer>;
let url: string;
let conversationId: string;
let listingId: string;
const emails: NewMessageNotice[] = [];
const clients: Client[] = [];

beforeAll(async () => {
  pg = await createDb();
  await migrate(pg);
  for (const u of Object.values(U)) await pg.query(`insert into auth.users (id, email) values ($1, $2)`, [u.id, `${u.token}@test.dev`]);
  listingId = (
    await pg.query<{ id: string }>(
      `insert into public.listings (title, description, price, property_type, bedrooms, bathrooms, address, city, province, postal_code, university_id, user_id)
       values ('Room', 'A room', 800, 'house', 1, 1, 'Sterling St', 'Hamilton', 'ON', 'L8S 4H9', 'mcmaster', $1) returning id`,
      [U.landlord.id],
    )
  ).rows[0].id;
  conversationId = (
    await pg.query<{ id: string }>(`insert into public.conversations (listing_id, student_id, landlord_id) values ($1, $2, $3) returning id`, [
      listingId,
      U.student.id,
      U.landlord.id,
    ])
  ).rows[0].id;

  service = createRealtimeServer({
    verifyToken: async (token) => {
      const u = Object.values(U).find((x) => x.token === token);
      return u ? { id: u.id } : null;
    },
    db: drizzle(pg) as unknown as Db,
    notifyOffline: async (notice) => {
      emails.push(notice);
    },
    notifySecret: SECRET,
    sendLimit: 6,
  });
  await new Promise<void>((resolve) => service.server.listen(0, resolve));
  url = `http://127.0.0.1:${(service.server.address() as AddressInfo).port}`;
}, 120_000);

afterEach(() => {
  for (const c of clients.splice(0)) c.disconnect();
});
afterAll(async () => {
  await service?.close();
  await pg?.close();
});

/** Connects and waits for the first unread snapshot, which arrives once the service has joined the user's rooms. */
async function signIn(token: string): Promise<Client> {
  const socket: Client = connect(url, { auth: { token }, transports: ["websocket"], reconnection: false });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("unread:update", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}

const next = <E extends keyof ServerToClientEvents>(socket: Client, event: E, ms = 2000) =>
  new Promise<Parameters<ServerToClientEvents[E]>[0]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), ms);
    (socket as Socket).once(event, (payload: never) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const silent = (socket: Client, event: keyof ServerToClientEvents, ms = 300) =>
  new Promise<boolean>((resolve) => {
    let heard = false;
    (socket as Socket).once(event, () => (heard = true));
    setTimeout(() => resolve(!heard), ms);
  });

const emit = <T>(socket: Client, event: "message:send" | "message:read" | "conversation:join", payload: object) =>
  new Promise<Ack<T>>((resolve) => (socket as Socket).emit(event, payload, resolve));

describe("connecting", () => {
  it("refuses a missing or invalid token", async () => {
    for (const auth of [{}, { token: "nope" }]) {
      const socket: Client = connect(url, { auth, transports: ["websocket"], reconnection: false });
      clients.push(socket);
      await expect(new Promise((_, reject) => socket.once("connect_error", reject))).rejects.toThrow("Sign in required");
    }
  });

  it("sends an unread snapshot on connect", async () => {
    const socket: Client = connect(url, { auth: { token: U.landlord.token }, transports: ["websocket"], reconnection: false });
    clients.push(socket);
    expect(await next(socket, "unread:update")).toEqual({ conversationId: null, unreadCount: 0, total: 0 });
  });
});

describe("messaging in a conversation room", () => {
  it("delivers a message to both people with unread counts for the receiver", async () => {
    const student = await signIn(U.student.token);
    const landlord = await signIn(U.landlord.token);
    const arrivedForLandlord = next(landlord, "message:new");
    const arrivedForStudent = next(student, "message:new");
    const unread = next(landlord, "unread:update");

    const ack = await emit<{ message: Message }>(student, "message:send", { conversationId, content: "Is it available?" });
    expect(ack.ok).toBe(true);

    for (const message of [await arrivedForLandlord, await arrivedForStudent]) {
      expect(message).toMatchObject({ conversationId, senderId: U.student.id, receiverId: U.landlord.id, content: "Is it available?", isRead: false });
    }
    expect(await unread).toEqual({ conversationId, unreadCount: 1, total: 1 });

    const saved = await pg.query(`select content, is_read from public.messages where conversation_id = $1`, [conversationId]);
    expect(saved.rows).toEqual([{ content: "Is it available?", is_read: false }]);
  });

  it("sends a read receipt to the sender and clears the receiver's unread count", async () => {
    const student = await signIn(U.student.token);
    const landlord = await signIn(U.landlord.token);
    const receipt = next(student, "message:read");
    const unread = next(landlord, "unread:update");

    const ack = await emit<{ messageIds: string[] }>(landlord, "message:read", { conversationId });
    expect(ack.ok && ack.messageIds).toHaveLength(1);

    expect(await receipt).toMatchObject({ conversationId, readerId: U.landlord.id });
    expect(await unread).toEqual({ conversationId, unreadCount: 0, total: 0 });
    const saved = await pg.query(`select is_read from public.messages where conversation_id = $1`, [conversationId]);
    expect(saved.rows.every((r: { is_read: boolean }) => r.is_read)).toBe(true);
  });

  it("does nothing the second time there is nothing to read", async () => {
    const landlord = await signIn(U.landlord.token);
    const ack = await emit<{ messageIds: string[] }>(landlord, "message:read", { conversationId });
    expect(ack).toEqual({ ok: true, messageIds: [] });
  });

  it("relays typing to the other person only", async () => {
    const student = await signIn(U.student.token);
    const landlord = await signIn(U.landlord.token);
    const heardByLandlord = next(landlord, "typing");
    const echoedToStudent = silent(student, "typing");
    student.emit("typing", { conversationId, isTyping: true });
    expect(await heardByLandlord).toEqual({ conversationId, userId: U.student.id, isTyping: true });
    expect(await echoedToStudent).toBe(true);
  });

  it("keeps outsiders out of the room", async () => {
    const student = await signIn(U.student.token);
    const outsider = await signIn(U.outsider.token);
    const leaked = silent(outsider, "message:new");

    expect(await emit(outsider, "conversation:join", { conversationId })).toEqual({ ok: false, error: "Conversation not found" });
    expect(await emit(outsider, "message:send", { conversationId, content: "hello?" })).toEqual({ ok: false, error: "Conversation not found" });
    outsider.emit("typing", { conversationId, isTyping: true });
    await emit(student, "message:send", { conversationId, content: "Still there?" });
    expect(await leaked).toBe(true);
  });

  it("rejects empty and oversized messages", async () => {
    const student = await signIn(U.student.token);
    expect((await emit(student, "message:send", { conversationId, content: "   " })).ok).toBe(false);
    expect((await emit(student, "message:send", { conversationId, content: "x".repeat(2001) })).ok).toBe(false);
    expect((await emit(student, "message:send", { conversationId: "nope", content: "hi" })).ok).toBe(false);
  });

  it("limits how fast one person can send", async () => {
    // The landlord sends here so the student's own window stays free for the offline email tests.
    const landlord = await signIn(U.landlord.token);
    const results = [];
    for (let i = 0; i < 8; i++) results.push(await emit(landlord, "message:send", { conversationId, content: `burst ${i}` }));
    expect(results.some((r) => !r.ok && r.error.includes("too fast"))).toBe(true);
  });
});

describe("offline email", () => {
  it("emails only when the receiver has no open connection, and only for the first unread message", async () => {
    await pg.query(`update public.messages set is_read = true`);
    emails.length = 0;
    await new Promise((r) => setTimeout(r, 150)); // let the previous test's sockets finish disconnecting
    const student = await signIn(U.student.token);
    // The landlord has no connection: this is the first unread message, so one email.
    await emit(student, "message:send", { conversationId, content: "Offline hello" });
    await new Promise((r) => setTimeout(r, 100));
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ conversationId, senderId: U.student.id, receiverId: U.landlord.id, content: "Offline hello" });

    await emit(student, "message:send", { conversationId, content: "Second in a row" });
    await new Promise((r) => setTimeout(r, 100));
    expect(emails).toHaveLength(1);
  });

  it("does not email someone who is connected", async () => {
    await pg.query(`update public.messages set is_read = true`);
    emails.length = 0;
    const student = await signIn(U.student.token);
    await signIn(U.landlord.token);
    await emit(student, "message:send", { conversationId, content: "You there?" });
    await new Promise((r) => setTimeout(r, 100));
    expect(emails).toHaveLength(0);
  });
});

describe("notifications from the API", () => {
  const post = (body: unknown, secret?: string) =>
    fetch(`${url}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { "X-Notify-Secret": secret } : {}) },
      body: JSON.stringify(body),
    });
  const event = { userId: U.landlord.id, type: "viewing:requested", payload: { viewingRequest: { id: "x" } } };

  it("pushes an event to the named user only", async () => {
    const landlord = await signIn(U.landlord.token);
    const student = await signIn(U.student.token);
    const heard = next(landlord, "notification");
    const leaked = silent(student, "notification");

    expect((await post(event, SECRET)).status).toBe(202);
    expect(await heard).toMatchObject({ type: "viewing:requested", payload: { viewingRequest: { id: "x" } } });
    expect(await leaked).toBe(true);
  });

  it("refuses a wrong or missing secret and malformed events", async () => {
    expect((await post(event)).status).toBe(401);
    expect((await post(event, "wrong-secret")).status).toBe(401);
    expect((await post({ userId: "nope", type: "viewing:requested", payload: {} }, SECRET)).status).toBe(400);
    expect((await post({ ...event, type: "free:money" }, SECRET)).status).toBe(400);
  });

  it("answers health checks", async () => {
    expect(await (await fetch(`${url}/health`)).json()).toEqual({ ok: true });
  });
});
