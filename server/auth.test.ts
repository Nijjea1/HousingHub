import { describe, expect, it, vi } from "vitest";
import { cacheVerifiedTokens } from "./auth";

const USER = { id: "0a000000-0000-4000-8000-00000000000a" };
const NOW = Date.parse("2026-10-14T12:00:00Z");

/** A token-shaped string whose payload carries `exp` (seconds). The signature part is irrelevant here. */
const tokenExpiringAt = (ms: number) =>
  `h.${Buffer.from(JSON.stringify({ sub: USER.id, exp: Math.floor(ms / 1000) })).toString("base64url")}.s`;

function setup(verifyResult: typeof USER | null = USER) {
  let clock = NOW;
  const verify = vi.fn(async () => verifyResult);
  const cached = cacheVerifiedTokens(verify, { ttlMs: 60_000, maxEntries: 2, now: () => clock });
  return { verify, cached, advance: (ms: number) => (clock += ms) };
}

describe("cacheVerifiedTokens", () => {
  it("verifies a token once and reuses the result within the TTL", async () => {
    const { verify, cached, advance } = setup();
    const token = tokenExpiringAt(NOW + 3_600_000);
    expect(await cached(token)).toEqual(USER);
    advance(59_000);
    expect(await cached(token)).toEqual(USER);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it("verifies again after the TTL", async () => {
    const { verify, cached, advance } = setup();
    const token = tokenExpiringAt(NOW + 3_600_000);
    await cached(token);
    advance(60_000);
    await cached(token);
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it("never keeps a token past its own expiry", async () => {
    const { verify, cached, advance } = setup();
    const token = tokenExpiringAt(NOW + 10_000);
    await cached(token);
    advance(10_000);
    await cached(token);
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it("does not cache failed verifications", async () => {
    const { verify, cached } = setup(null);
    const token = tokenExpiringAt(NOW + 3_600_000);
    expect(await cached(token)).toBeNull();
    expect(await cached(token)).toBeNull();
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it("evicts the oldest token when full", async () => {
    const { verify, cached } = setup();
    const [a, b, c] = [1, 2, 3].map((n) => tokenExpiringAt(NOW + 3_600_000 + n * 1000));
    await cached(a);
    await cached(b);
    await cached(c);
    await cached(b);
    expect(verify).toHaveBeenCalledTimes(3);
    await cached(a);
    expect(verify).toHaveBeenCalledTimes(4);
  });
});
