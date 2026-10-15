import { describe, expect, it } from "vitest";
import { DEFAULT_LISTING_FILTERS, DEFAULT_SEARCH_PARAMS, listingSchema } from "./schema";
import {
  listingFromRow,
  newMessageRow,
  listingToRow,
  preferencesFromRow,
  savedListingFromRow,
  searchResultFromRow,
  searchToArgs,
  signUpMetadata,
  type ListingRow,
} from "./mappers";

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

describe("signUpMetadata", () => {
  it("uses the keys the handle_new_user trigger reads", () => {
    expect(signUpMetadata({ fullName: "Ava Chen", role: "landlord", universityId: "mcmaster" })).toEqual({
      full_name: "Ava Chen",
      role: "landlord",
      university_id: "mcmaster",
    });
  });
});

describe("search mappers", () => {
  it("turns a search_listings row into a listing and a distance in km", () => {
    const result = searchResultFromRow({ listing: row, distance_m: "1250.5" });
    expect(result.listing.id).toBe(row.id);
    expect(result.distanceKm).toBeCloseTo(1.2505, 9);
    expect(searchResultFromRow({ listing: row, distance_m: null }).distanceKm).toBeNull();
  });

  it("sends km as metres, empty lists as null, and no radius without a center", () => {
    const args = searchToArgs({
      center: { latitude: 43.26, longitude: -79.92 },
      radiusKm: 2,
      limit: 50,
      filters: { ...DEFAULT_LISTING_FILTERS, propertyTypes: ["house"], furnished: true, sortBy: "distance" },
    });
    expect(args).toMatchObject({
      center_lat: 43.26,
      center_lng: -79.92,
      radius_m: 2000,
      property_types: ["house"],
      required_amenities: null,
      is_furnished: true,
      sort_by: "distance",
      max_results: 50,
    });
    expect(searchToArgs({ ...DEFAULT_SEARCH_PARAMS, radiusKm: 2 }).radius_m).toBeNull();
  });
});

describe("message mappers", () => {
  const conversation = {
    id: "c0000000-0000-4000-8000-000000000001",
    listingId: row.id,
    studentId: "0a000000-0000-4000-8000-00000000000a",
    landlordId: "0b000000-0000-4000-8000-00000000000b",
    createdAt: "2026-10-14T00:00:00Z",
    lastMessageAt: "2026-10-14T00:00:00Z",
  };

  it("addresses a new message to the other participant", () => {
    expect(newMessageRow(conversation, conversation.studentId, "Hi").receiver_id).toBe(conversation.landlordId);
    expect(newMessageRow(conversation, conversation.landlordId, "Hi").receiver_id).toBe(conversation.studentId);
    expect(newMessageRow(conversation, conversation.studentId, "Hi")).toMatchObject({
      conversation_id: conversation.id,
      listing_id: row.id,
      content: "Hi",
    });
  });
});

describe("savedListingFromRow", () => {
  const favorite = {
    id: "f0000000-0000-4000-8000-000000000001",
    user_id: "0a000000-0000-4000-8000-00000000000a",
    listing_id: row.id,
    note: "Close to the bus",
    collection_name: "Shortlist",
    created_at: "2026-10-14T00:00:00Z",
  };

  it("pairs the favorite with its listing", () => {
    const saved = savedListingFromRow({ ...favorite, listing: row });
    expect(saved?.favorite).toMatchObject({ note: "Close to the bus", collectionName: "Shortlist" });
    expect(saved?.listing.id).toBe(row.id);
  });

  it("returns null when the listing is missing", () => {
    expect(savedListingFromRow({ ...favorite, listing: null })).toBeNull();
  });
});
