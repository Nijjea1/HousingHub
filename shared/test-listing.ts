/** A valid Listing with sensible defaults, for tests. Each call gets a new id. */
import type { Listing } from "./schema";

let nextId = 0;
export function makeListing(overrides: Partial<Listing> = {}): Listing {
  nextId += 1;
  return {
    id: `00000000-0000-4000-8000-${String(nextId).padStart(12, "0")}`,
    userId: "0a000000-0000-4000-8000-000000000000",
    universityId: "mcmaster",
    title: `Listing ${nextId}`,
    description: "A place near campus.",
    detailedDescription: null,
    price: 800,
    propertyType: "house",
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: null,
    address: "1 Example St",
    neighborhood: null,
    city: "Hamilton",
    province: "ON",
    postalCode: "L8S 1C7",
    latitude: null,
    longitude: null,
    amenities: [],
    images: [],
    utilitiesIncluded: [],
    nearbyPlaces: [],
    isAvailable: true,
    availableFrom: null,
    leaseTerm: null,
    petsAllowed: false,
    furnished: false,
    distanceFromCampus: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}
