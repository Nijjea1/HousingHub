import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_LISTING_FILTERS } from "../../shared/schema";
import { NOW, USERS, startDbApi } from "./api-db";

let api: Awaited<ReturnType<typeof startDbApi>>;
const { landlord, student, other } = USERS;
const published: Array<{ userId: string; type: string; payload: Record<string, unknown> }> = [];
const missingId = "00000000-0000-4000-8000-0000000000ff";

beforeAll(async () => {
  api = await startDbApi({
    publish: async (event) => {
      published.push(event);
    },
  });
}, 120_000);
afterAll(() => api?.close());

describe("favorites", () => {
  it("needs a signed-in user", async () => {
    expect((await api.request("GET", "/api/favorites")).status).toBe(401);
    expect((await api.request("PUT", `/api/favorites/${api.listingId}`, { body: {} })).status).toBe(401);
  });

  it("saves a listing with a note and collection, then lists it with the listing embedded", async () => {
    const put = await api.request("PUT", `/api/favorites/${api.listingId}`, {
      token: student.token,
      body: { note: "Ask about parking", collectionName: "Top picks" },
    });
    expect(put.status).toBe(200);
    expect(put.body.favorite).toMatchObject({ userId: student.id, listingId: api.listingId, note: "Ask about parking", collectionName: "Top picks" });
    expect(put.body.favorite.createdAt).toMatch(/^\d{4}-\d\d-\d\dT/);

    const list = await api.request("GET", "/api/favorites", { token: student.token });
    expect(list.body.favorites).toHaveLength(1);
    expect(list.body.favorites[0].listing).toMatchObject({ id: api.listingId, title: "Room near campus", price: 800 });
    expect(list.body.favorites[0].favorite.note).toBe("Ask about parking");
  });

  it("updates the note when the listing is already saved instead of duplicating it", async () => {
    await api.request("PUT", `/api/favorites/${api.listingId}`, { token: student.token, body: { note: "Visited, loved it" } });
    const list = await api.request("GET", "/api/favorites", { token: student.token });
    expect(list.body.favorites).toHaveLength(1);
    expect(list.body.favorites[0].favorite).toMatchObject({ note: "Visited, loved it", collectionName: null });
  });

  it("keeps favorites private", async () => {
    expect((await api.request("GET", "/api/favorites", { token: other.token })).body.favorites).toEqual([]);
    expect((await api.request("DELETE", `/api/favorites/${api.listingId}`, { token: other.token })).status).toBe(404);
  });

  it("rejects bad input and unknown listings", async () => {
    expect((await api.request("PUT", "/api/favorites/not-a-uuid", { token: student.token, body: {} })).status).toBe(400);
    const long = await api.request("PUT", `/api/favorites/${api.listingId}`, { token: student.token, body: { note: "x".repeat(501) } });
    expect(long.status).toBe(400);
    expect(long.body.fields.note).toBeDefined();
    expect((await api.request("PUT", `/api/favorites/${missingId}`, { token: student.token, body: {} })).status).toBe(404);
  });

  it("removes a favorite", async () => {
    expect((await api.request("DELETE", `/api/favorites/${api.listingId}`, { token: student.token })).status).toBe(204);
    expect((await api.request("GET", "/api/favorites", { token: student.token })).body.favorites).toEqual([]);
  });
});

describe("saved searches", () => {
  const params = { center: { latitude: 43.2609, longitude: -79.9192 }, radiusKm: 2, filters: { ...DEFAULT_LISTING_FILTERS, maxPrice: 1000 } };
  let id: string;

  it("needs a signed-in user", async () => {
    expect((await api.request("GET", "/api/saved-searches")).status).toBe(401);
  });

  it("saves and lists a search", async () => {
    const created = await api.request("POST", "/api/saved-searches", { token: student.token, body: { name: "Near campus", params } });
    expect(created.status).toBe(201);
    id = created.body.savedSearch.id;
    expect(created.body.savedSearch).toMatchObject({ name: "Near campus", userId: student.id });
    expect(created.body.savedSearch.params.filters.maxPrice).toBe(1000);

    const list = await api.request("GET", "/api/saved-searches", { token: student.token });
    expect(list.body.savedSearches).toHaveLength(1);
  });

  it("validates the name and the search", async () => {
    const noName = await api.request("POST", "/api/saved-searches", { token: student.token, body: { name: "  ", params } });
    expect(noName.status).toBe(400);
    expect(noName.body.fields.name).toBeDefined();
    expect((await api.request("POST", "/api/saved-searches", { token: student.token, body: { name: "x", params: { radiusKm: 999 } } })).status).toBe(400);
  });

  it("keeps searches private and only lets the owner delete", async () => {
    expect((await api.request("GET", "/api/saved-searches", { token: other.token })).body.savedSearches).toEqual([]);
    expect((await api.request("DELETE", `/api/saved-searches/${id}`, { token: other.token })).status).toBe(404);
    expect((await api.request("DELETE", `/api/saved-searches/${id}`, { token: student.token })).status).toBe(204);
  });

  it("caps how many a user can save", async () => {
    for (let i = 0; i < 25; i++) {
      const res = await api.request("POST", "/api/saved-searches", { token: other.token, body: { name: `Search ${i}`, params } });
      expect(res.status).toBe(201);
    }
    expect((await api.request("POST", "/api/saved-searches", { token: other.token, body: { name: "One too many", params } })).status).toBe(400);
  });
});

describe("viewing requests", () => {
  const future = new Date(NOW + 2 * 24 * 3600 * 1000).toISOString();
  let id: string;

  it("lets a student propose a time", async () => {
    const res = await api.request("POST", `/api/listings/${api.listingId}/viewings`, {
      token: student.token,
      body: { proposedAt: future, message: "Can I see it Thursday?" },
    });
    expect(res.status).toBe(201);
    id = res.body.viewingRequest.id;
    expect(res.body.viewingRequest).toMatchObject({
      listingId: api.listingId,
      studentId: student.id,
      landlordId: landlord.id,
      status: "pending",
      proposedAt: future,
    });
  });

  it("rejects the past, the listing's owner, unknown listings, signed-out callers and bad dates", async () => {
    const path = `/api/listings/${api.listingId}/viewings`;
    const past = new Date(NOW - 3600 * 1000).toISOString();
    expect((await api.request("POST", path, { token: student.token, body: { proposedAt: past } })).status).toBe(400);
    expect((await api.request("POST", path, { token: landlord.token, body: { proposedAt: future } })).status).toBe(400);
    expect((await api.request("POST", `/api/listings/${missingId}/viewings`, { token: student.token, body: { proposedAt: future } })).status).toBe(404);
    expect((await api.request("POST", path, { body: { proposedAt: future } })).status).toBe(401);
    const bad = await api.request("POST", path, { token: student.token, body: { proposedAt: "tomorrow" } });
    expect(bad.status).toBe(400);
    expect(bad.body.fields.proposedAt).toBeDefined();
  });

  it("shows the request to the student and the owner only", async () => {
    expect((await api.request("GET", "/api/viewings", { token: student.token })).body.viewingRequests).toHaveLength(1);
    expect((await api.request("GET", "/api/viewings", { token: landlord.token })).body.viewingRequests).toHaveLength(1);
    expect((await api.request("GET", "/api/viewings", { token: other.token })).body.viewingRequests).toEqual([]);
  });

  it("tells the owner live when a request arrives", () => {
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ userId: landlord.id, type: "viewing:requested", payload: { viewingRequest: { id, status: "pending" } } });
  });

  it("only lets the owner answer, and only with accepted or declined", async () => {
    expect((await api.request("PATCH", `/api/viewings/${id}`, { token: student.token, body: { status: "accepted" } })).status).toBe(404);
    expect((await api.request("PATCH", `/api/viewings/${id}`, { token: other.token, body: { status: "accepted" } })).status).toBe(404);
    expect((await api.request("PATCH", `/api/viewings/${id}`, { token: landlord.token, body: { status: "pending" } })).status).toBe(400);
    const ok = await api.request("PATCH", `/api/viewings/${id}`, { token: landlord.token, body: { status: "accepted" } });
    expect(ok.status).toBe(200);
    expect(ok.body.viewingRequest.status).toBe("accepted");
    expect((await api.request("GET", "/api/viewings", { token: student.token })).body.viewingRequests[0].status).toBe("accepted");
    // Only the successful answer is announced, and it goes to the student.
    expect(published).toHaveLength(2);
    expect(published[1]).toMatchObject({ userId: student.id, type: "viewing:answered", payload: { viewingRequest: { id, status: "accepted" } } });
  });
});

describe("reviews", () => {
  const path = () => `/api/listings/${api.listingId}/reviews`;

  it("starts empty and is public", async () => {
    const res = await api.request("GET", path());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reviews: [], count: 0, average: null });
  });

  it("lets a signed-in user review once, with their name attached", async () => {
    const created = await api.request("POST", path(), { token: student.token, body: { rating: 5, body: "Great landlord" } });
    expect(created.status).toBe(201);
    expect(created.body.review).toMatchObject({ authorId: student.id, authorName: "Sam Student", rating: 5, body: "Great landlord" });
    expect((await api.request("POST", path(), { token: student.token, body: { rating: 4, body: "Again" } })).status).toBe(409);
  });

  it("averages ratings across reviewers", async () => {
    await api.request("POST", path(), { token: other.token, body: { rating: 4, body: "Quiet street" } });
    const res = await api.request("GET", path());
    expect(res.body.count).toBe(2);
    expect(res.body.average).toBe(4.5);
    expect(res.body.reviews[0].authorName).toBeTruthy();
  });

  it("blocks the owner, signed-out callers and invalid reviews", async () => {
    expect((await api.request("POST", path(), { token: landlord.token, body: { rating: 5, body: "Best listing" } })).status).toBe(403);
    expect((await api.request("POST", path(), { body: { rating: 5, body: "x" } })).status).toBe(401);
    expect((await api.request("POST", path(), { token: student.token, body: { rating: 6, body: "x" } })).status).toBe(400);
    expect((await api.request("POST", path(), { token: student.token, body: { rating: 3.5, body: "x" } })).status).toBe(400);
    expect((await api.request("POST", path(), { token: student.token, body: { rating: 3, body: "   " } })).status).toBe(400);
    expect((await api.request("POST", `/api/listings/${missingId}/reviews`, { token: other.token, body: { rating: 3, body: "x" } })).status).toBe(404);
  });
});

describe("conversation reads", () => {
  let conversationId: string;

  it("starts with an empty inbox and needs sign-in", async () => {
    expect((await api.request("GET", "/api/conversations")).status).toBe(401);
    expect((await api.request("GET", "/api/conversations", { token: student.token })).body.conversations).toEqual([]);
  });

  it("returns the inbox entry and the messages to participants only", async () => {
    const conv = await api.pg.query<{ id: string }>(
      `insert into public.conversations (listing_id, student_id, landlord_id) values ($1, $2, $3) returning id`,
      [api.listingId, student.id, landlord.id],
    );
    conversationId = conv.rows[0].id;
    await api.pg.query(
      `insert into public.messages (conversation_id, sender_id, receiver_id, listing_id, content, created_at) values
       ($1, $2, $3, $4, 'Is it available?', now() - interval '1 minute'), ($1, $3, $2, $4, 'Yes, from September', now())`,
      [conversationId, student.id, landlord.id, api.listingId],
    );

    const inbox = await api.request("GET", "/api/conversations", { token: student.token });
    expect(inbox.body.conversations).toHaveLength(1);
    expect(inbox.body.conversations[0]).toMatchObject({
      conversationId,
      listingTitle: "Room near campus",
      otherUserId: landlord.id,
      otherName: "Lena Landlord",
      lastMessage: "Yes, from September",
      unreadCount: 1,
    });

    const thread = await api.request("GET", `/api/conversations/${conversationId}/messages`, { token: landlord.token });
    expect(thread.status).toBe(200);
    expect(thread.body.messages.map((m: { content: string }) => m.content)).toEqual(["Is it available?", "Yes, from September"]);
    expect(thread.body.messages[0]).toMatchObject({ conversationId, senderId: student.id, receiverId: landlord.id, isRead: false });
    expect(thread.body.messages[0].createdAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it("hides the thread from outsiders and rejects bad ids", async () => {
    expect((await api.request("GET", `/api/conversations/${conversationId}/messages`, { token: other.token })).status).toBe(404);
    expect((await api.request("GET", "/api/conversations", { token: other.token })).body.conversations).toEqual([]);
    expect((await api.request("GET", "/api/conversations/nope/messages", { token: student.token })).status).toBe(400);
    expect((await api.request("GET", `/api/conversations/${conversationId}/messages`)).status).toBe(401);
  });
});

describe("without a database connection", () => {
  it("answers 503 instead of crashing", async () => {
    const bare = await startDbApi({ db: undefined });
    try {
      expect((await bare.request("GET", "/api/favorites", { token: student.token })).status).toBe(503);
    } finally {
      await bare.close();
    }
  }, 120_000);
});

describe("commute", () => {
  let clock = NOW;
  const calls: Array<{ mode: string; from: unknown; to: unknown }> = [];
  let failNext = false;
  let commuteApi: Awaited<ReturnType<typeof startDbApi>>;

  beforeAll(async () => {
    commuteApi = await startDbApi({
      now: () => clock,
      routing: {
        supports: (mode) => mode !== "transit",
        route: async (mode, from, to) => {
          calls.push({ mode, from, to });
          if (failNext) throw new Error("provider down");
          return { minutes: mode === "walk" ? 14.5 : 5, distanceM: 1105, geometry: "_p~iF~ps|U" };
        },
      },
    });
  }, 120_000);
  afterAll(() => commuteApi?.close());

  const path = (mode: string, id = () => commuteApi.listingId) => `/api/listings/${id()}/commute?mode=${mode}`;

  it("answers 503 when no routing provider is configured", async () => {
    const res = await api.request("GET", `/api/listings/${api.listingId}/commute?mode=walk`);
    expect(res.status).toBe(503);
  });

  it("validates the mode and the listing", async () => {
    expect((await commuteApi.request("GET", path("teleport"))).status).toBe(400);
    expect((await commuteApi.request("GET", `/api/listings/not-a-uuid/commute?mode=walk`)).status).toBe(400);
    expect((await commuteApi.request("GET", `/api/listings/${missingId}/commute?mode=walk`)).status).toBe(404);
  });

  it("routes from the listing to its campus and returns minutes, distance and the route line", async () => {
    const res = await commuteApi.request("GET", path("walk"));
    expect(res.status).toBe(200);
    expect(res.body.commute).toEqual({ listingId: commuteApi.listingId, mode: "walk", minutes: 14.5, distanceM: 1105, geometry: "_p~iF~ps|U" });
    expect(calls).toHaveLength(1);
    expect(calls[0].from).toEqual({ latitude: 43.262, longitude: -79.9106 });
    expect(calls[0].to).toMatchObject({ latitude: expect.any(Number), longitude: expect.any(Number) });
  });

  it("serves the cached answer without calling the provider again", async () => {
    const res = await commuteApi.request("GET", path("walk"));
    expect(res.body.commute.minutes).toBe(14.5);
    expect(calls).toHaveLength(1);
  });

  it("caches each mode separately", async () => {
    expect((await commuteApi.request("GET", path("bike"))).body.commute.minutes).toBe(5);
    expect(calls).toHaveLength(2);
  });

  it("asks the provider again after 30 days", async () => {
    clock = NOW + 31 * 24 * 3600 * 1000;
    await commuteApi.request("GET", path("walk"));
    expect(calls).toHaveLength(3);
    const rows = await commuteApi.pg.query(`select count(*)::int as n from public.commute_cache where mode = 'walk'`);
    expect(rows.rows[0]).toEqual({ n: 1 });
  });

  it("answers 503 for a mode the provider can't do", async () => {
    const res = await commuteApi.request("GET", path("transit"));
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/Transit/);
  });

  it("answers 502 when the provider fails and caches nothing", async () => {
    failNext = true;
    const res = await commuteApi.request("GET", path("drive"));
    expect(res.status).toBe(502);
    failNext = false;
    const rows = await commuteApi.pg.query(`select count(*)::int as n from public.commute_cache where mode = 'drive'`);
    expect(rows.rows[0]).toEqual({ n: 0 });
  });

  it("answers 422 for a listing with no map location", async () => {
    await commuteApi.pg.query(`update public.listings set latitude = null, longitude = null where id = $1`, [commuteApi.listingId]);
    const res = await commuteApi.request("GET", path("drive"));
    expect(res.status).toBe(422);
  });
});
