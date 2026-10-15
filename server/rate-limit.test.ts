import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks", () => {
    const { now } = clock();
    const hit = createRateLimiter({ limit: 3, windowMs: 1000, now });
    expect([hit("a"), hit("a"), hit("a")].map((r) => r.allowed)).toEqual([true, true, true]);
    expect(hit("a").allowed).toBe(false);
  });

  it("counts down the remaining hits and never goes below zero", () => {
    const { now } = clock();
    const hit = createRateLimiter({ limit: 2, windowMs: 1000, now });
    expect(hit("a").remaining).toBe(1);
    expect(hit("a").remaining).toBe(0);
    expect(hit("a").remaining).toBe(0);
  });

  it("tracks each key separately", () => {
    const { now } = clock();
    const hit = createRateLimiter({ limit: 1, windowMs: 1000, now });
    expect(hit("a").allowed).toBe(true);
    expect(hit("b").allowed).toBe(true);
    expect(hit("a").allowed).toBe(false);
  });

  it("starts a fresh window once the old one has fully passed", () => {
    const c = clock();
    const hit = createRateLimiter({ limit: 1, windowMs: 1000, now: c.now });
    hit("a");
    c.advance(999);
    expect(hit("a").allowed).toBe(false);
    c.advance(1);
    expect(hit("a").allowed).toBe(true);
  });

  it("reports when the current window resets", () => {
    const c = clock(5000);
    const hit = createRateLimiter({ limit: 5, windowMs: 1000, now: c.now });
    hit("a");
    c.advance(400);
    expect(hit("a").resetAt).toBe(6000);
  });
});
