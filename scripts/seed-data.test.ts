import { describe, expect, it } from "vitest";
import { listingInputSchema } from "../shared/schema";
import { SEED_LISTINGS } from "./seed-data";

describe("seed listings", () => {
  it.each(SEED_LISTINGS.map((l) => [l.title, l] as const))("%s passes the listing schema", (_, listing) => {
    const result = listingInputSchema.safeParse(listing);
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it("has unique titles so the seed output is readable", () => {
    const titles = SEED_LISTINGS.map((l) => l.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("never includes a house number in the address", () => {
    for (const listing of SEED_LISTINGS) expect(listing.address).not.toMatch(/\d/);
  });
});
