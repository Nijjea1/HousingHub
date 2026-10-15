import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TOKENS, startTestApi } from "./test-helpers";

let api: Awaited<ReturnType<typeof startTestApi>>;
beforeEach(async () => {
  api = await startTestApi();
});
afterEach(() => api.close());

describe("API basics", () => {
  it("answers the health check", async () => {
    const res = await api.request("GET", "/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const res = await api.request("GET", "/api/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 400 for a malformed JSON body", async () => {
    const res = await api.request("POST", "/api/health", { rawBody: "{not json" });
    expect(res.status).toBe(400);
  });

  it("does not reveal the framework", async () => {
    const res = await api.request("GET", "/api/health");
    expect(res.headers.get("x-powered-by")).toBeNull();
  });
});

describe("authentication", () => {
  it("lets requests without a token through as anonymous", async () => {
    expect((await api.request("GET", "/api/health")).status).toBe(200);
  });

  it("rejects a token that fails verification instead of treating it as anonymous", async () => {
    const res = await api.request("GET", "/api/health", { token: "forged" });
    expect(res.status).toBe(401);
  });

  it("accepts a valid token", async () => {
    const res = await api.request("GET", "/api/health", { token: TOKENS.landlord.token });
    expect(res.status).toBe(200);
  });
});
