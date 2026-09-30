import type {
  Favorite,
  Listing,
  ListingInput,
  Preferences,
  Profile,
  PropertyType,
  Province,
  University,
  UserRole,
} from "./schema";

// Row shapes as PostgREST returns them. Postgres numeric/decimal columns
// arrive as strings or numbers depending on the client, hence the unions.

type Numeric = number | string;

export interface ListingRow {
  id: string;
  user_id: string;
  university_id: string | null;
  title: string;
  description: string;
  detailed_description: string | null;
  price: Numeric;
  property_type: string;
  bedrooms: number;
  bathrooms: Numeric;
  square_feet: number | null;
  address: string;
  neighborhood: string | null;
  city: string;
  province: string;
  postal_code: string;
  latitude: Numeric | null;
  longitude: Numeric | null;
  amenities: string[];
  images: string[];
  utilities_included: string[];
  nearby_places: string[];
  is_available: boolean;
  available_from: string | null;
  lease_term: string | null;
  pets_allowed: boolean;
  furnished: boolean;
  distance_from_campus: string | null;
  created_at: string;
  updated_at: string;
}

export interface UniversityRow {
  id: string;
  name: string;
  short_name: string;
  city: string;
  province: string;
  latitude: Numeric;
  longitude: Numeric;
  is_active: boolean;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  listing_id: string;
  note: string | null;
  collection_name: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  university_id: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface PreferencesRow {
  user_id: string;
  max_rent: number | null;
  housing_types: string[];
  bedrooms: string | null;
  looking_for: string | null;
  wants_roommates: boolean;
}

const num = (v: Numeric) => (typeof v === "number" ? v : Number(v));
const numOrNull = (v: Numeric | null) => (v === null ? null : num(v));

export function listingFromRow(row: ListingRow): Listing {
  return {
    id: row.id,
    userId: row.user_id,
    universityId: row.university_id,
    title: row.title,
    description: row.description,
    detailedDescription: row.detailed_description,
    price: num(row.price),
    propertyType: row.property_type as PropertyType,
    bedrooms: row.bedrooms,
    bathrooms: num(row.bathrooms),
    squareFeet: row.square_feet,
    address: row.address,
    neighborhood: row.neighborhood,
    city: row.city,
    province: row.province as Province,
    postalCode: row.postal_code,
    latitude: numOrNull(row.latitude),
    longitude: numOrNull(row.longitude),
    amenities: row.amenities ?? [],
    images: row.images ?? [],
    utilitiesIncluded: row.utilities_included ?? [],
    nearbyPlaces: row.nearby_places ?? [],
    isAvailable: row.is_available,
    availableFrom: row.available_from,
    leaseTerm: row.lease_term,
    petsAllowed: row.pets_allowed,
    furnished: row.furnished,
    distanceFromCampus: row.distance_from_campus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Columns written on create/update. Ownership and timestamps are set by the database. */
export type ListingWriteRow = Omit<ListingRow, "id" | "user_id" | "created_at" | "updated_at">;

export function listingToRow(input: ListingInput): ListingWriteRow {
  return {
    university_id: input.universityId,
    title: input.title,
    description: input.description,
    detailed_description: input.detailedDescription,
    price: input.price,
    property_type: input.propertyType,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    square_feet: input.squareFeet,
    address: input.address,
    neighborhood: input.neighborhood,
    city: input.city,
    province: input.province,
    postal_code: input.postalCode,
    latitude: input.latitude,
    longitude: input.longitude,
    amenities: input.amenities,
    images: input.images,
    utilities_included: input.utilitiesIncluded,
    nearby_places: input.nearbyPlaces,
    is_available: input.isAvailable,
    available_from: input.availableFrom,
    lease_term: input.leaseTerm,
    pets_allowed: input.petsAllowed,
    furnished: input.furnished,
    distance_from_campus: input.distanceFromCampus,
  };
}

export function universityFromRow(row: UniversityRow): University {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    city: row.city,
    province: row.province as Province,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    isActive: row.is_active,
  };
}

export function favoriteFromRow(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userId: row.user_id,
    listingId: row.listing_id,
    note: row.note,
    collectionName: row.collection_name,
    createdAt: row.created_at,
  };
}

export function profileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    universityId: row.university_id,
    avatarUrl: row.avatar_url,
    role: row.role as UserRole,
    createdAt: row.created_at,
  };
}

export function preferencesFromRow(row: PreferencesRow | null): Preferences {
  return {
    maxRent: row?.max_rent ?? null,
    housingTypes: (row?.housing_types ?? []) as PropertyType[],
    bedrooms: row?.bedrooms ?? null,
    lookingFor: row?.looking_for ?? null,
    wantsRoommates: row?.wants_roommates ?? false,
  };
}

export function preferencesToRow(userId: string, prefs: Preferences): PreferencesRow {
  return {
    user_id: userId,
    max_rent: prefs.maxRent,
    housing_types: prefs.housingTypes,
    bedrooms: prefs.bedrooms,
    looking_for: prefs.lookingFor,
    wants_roommates: prefs.wantsRoommates,
  };
}
