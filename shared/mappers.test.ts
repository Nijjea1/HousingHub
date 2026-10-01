import { describe, expect, it } from "vitest";
import { listingSchema } from "./schema";
import { listingFromRow, listingToRow, preferencesFromRow, type ListingRow } from "./mappers";

const row: ListingRow = {
  id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  user_id: "0a000000-0000-4000-8000-000000000000",
  university_id: "mcmaster",
  title: "Bright room near Westdale",
  description: "Five minute walk to campus.",
  detailed_description: null,
  price: "850.00",
  property_type: "house",
  bedrooms: 4,
  bathrooms: "1.5",
  square_feet: null,
  address: "12 Example St",
  neighborhood: "Westdale",
  city: "Hamilton",
  province: "ON",
  postal_code: "L8S 1C7",
  latitude: "43.2609",
  longitude: -79.9192,
  amenities: ["WiFi", "Laundry"],
  images: [],
  utilities_included: [],
  nearby_places: [],
  is_available: true,
  available_from: "2026-09-01",
  lease_term: null,
  pets_allowed: false,
  furnished: true,
  distance_from_campus: null,
  created_at: "2026-09-29T12:00:00Z",
  updated_at: "2026-09-29T12:00:00Z",
};

describe("listingFromRow", () => {
  it("renames columns and turns numeric strings into numbers", () => {
    const listing = listingFromRow(row);
    expect(listing.userId).toBe(row.user_id);
    expect(listing.postalCode).toBe("L8S 1C7");
    expect(listing.price).toBe(850);
    expect(listing.bathrooms).toBe(1.5);
    expect(listing.latitude).toBe(43.2609);
    expect(listing.squareFeet).toBeNull();
  });

  it("treats missing arrays as empty", () => {
    const listing = listingFromRow({ ...row, amenities: null } as unknown as ListingRow);
    expect(listing.amenities).toEqual([]);
  });

  it("produces a value the listing schema accepts", () => {
    expect(() => listingSchema.parse(listingFromRow(row))).not.toThrow();
  });
});

describe("listingToRow", () => {
  it("round-trips the writable columns", () => {
    const { id, user_id, created_at, updated_at, ...writable } = row;
    const expected = { ...writable, price: 850, bathrooms: 1.5, latitude: 43.2609 };
    expect(listingToRow(listingFromRow(row))).toEqual(expected);
  });
});

describe("preferencesFromRow", () => {
  it("returns defaults when the user has no preferences row", () => {
    expect(preferencesFromRow(null)).toEqual({
      maxRent: null,
      housingTypes: [],
      bedrooms: null,
      lookingFor: null,
      wantsRoommates: false,
    });
  });
});
