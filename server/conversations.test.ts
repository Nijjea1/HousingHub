import { afterEach, describe, expect, it, vi } from "vitest";
import { TOKENS, startTestApi, validInput } from "./test-helpers";

let api: Awaited<ReturnType<typeof startTestApi>>;
afterEach(() => api?.close());

const landlord = TOKENS.landlord;
const student = TOKENS.student;
const outsider = TOKENS.other;

async function createListing() {
  const res = await api.request("POST", "/api/listings", { token: landlord.token, body: validInput() });
  return (await res.json()).listing;
}

const start = (listingId: string, content = "Is it available?", token: string = student.token) =>
  api.request("POST", "/api/conversations", { token, body: { listingId, content } });

const reply = (conversationId: string, content: string, token: string) =>
  api.request("POST", `/api/conversations/${conversationId}/messages`, { token, body: { content } });

describe("POST /api/conversations", () => {
  it("starts a conversation with the listing's owner and sends the first message", async () => {
    api = await startTestApi();
    const listing = await createListing();
    const res = await start(listing.id);
    expect(res.status).toBe(201);
    const { conversation, message } = await res.json();
    expect(conversation).toMatchObject({ listingId: listing.id, studentId: student.id, landlordId: landlord.id });
    expect(message).toMatchObject({ senderId: student.id, receiverId: landlord.id, content: "Is it available?" });
  });

  it("reuses the existing conversation for the same listing", async () => {
    api = await startTestApi();
    const listing = await createListing();
    const first = (await (await start(listing.id)).json()).conversation;
    const second = (await (await start(listing.id, "Following up")).json()).conversation;
    expect(second.id).toBe(first.id);
    expect(api.messages.messages).toHaveLength(2);
  });

  it("requires sign-in, a real listing, a message, and not your own listing", async () => {
    api = await startTestApi();
    const listing = await createListing();
    const anonymous = await api.request("POST", "/api/conversations", { body: { listingId: listing.id, content: "hi" } });
    expect(anonymous.status).toBe(401);
    expect((await start("7c9e6679-7425-40de-944b-e07fc1f90ae7")).status).toBe(404);
    const empty = await start(listing.id, "   ");
    expect(empty.status).toBe(400);
    expect((await empty.json()).fields.content).toEqual(["Write a message first"]);
    expect((await start(listing.id, "hi", landlord.token)).status).toBe(400);
  });
});

describe("POST /api/conversations/:id/messages", () => {
  it("lets either participant reply and addresses it to the other one", async () => {
    api = await startTestApi();
    const { conversation } = await (await start((await createListing()).id)).json();
    const res = await reply(conversation.id, "Yes, from September", landlord.token);
    expect(res.status).toBe(201);
    expect((await res.json()).message).toMatchObject({ senderId: landlord.id, receiverId: student.id });
  });

  it("returns 404 to someone outside the conversation and stores nothing", async () => {
    api = await startTestApi();
    const { conversation } = await (await start((await createListing()).id)).json();
    const res = await reply(conversation.id, "Let me in", outsider.token);
    expect(res.status).toBe(404);
    expect(api.messages.messages).toHaveLength(1);
  });

  it("returns 400 for a malformed id or a message over 2000 characters", async () => {
    api = await startTestApi();
    const { conversation } = await (await start((await createListing()).id)).json();
    expect((await reply("not-a-uuid", "hi", student.token)).status).toBe(400);
    expect((await reply(conversation.id, "x".repeat(2001), student.token)).status).toBe(400);
  });
});

describe("offline email alerts", () => {
  it("notifies once per batch of unread messages, then again after the receiver reads", async () => {
    api = await startTestApi();
    const { conversation } = await (await start((await createListing()).id)).json();
    await reply(conversation.id, "Also, is parking included?", student.token);
    expect(api.notices.map((n) => n.receiverId)).toEqual([landlord.id]);

    api.messages.markRead(conversation.id, landlord.id);
    await reply(conversation.id, "One more question", student.token);
    expect(api.notices).toHaveLength(2);
    expect(api.notices[1]).toMatchObject({ conversationId: conversation.id, senderId: student.id, content: "One more question" });
  });

  it("still sends the message when the notifier fails", async () => {
    api = await startTestApi({
      notifyNewMessage: async () => {
        throw new Error("email provider down");
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await start((await createListing()).id);
    warn.mockRestore();
    expect(res.status).toBe(201);
  });
});
