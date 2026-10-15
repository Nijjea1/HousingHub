import type {
  Conversation,
  Favorite,
  InboxEntry,
  Listing,
  ListingInput,
  Message,
  Preferences,
  Profile,
  PropertyType,
  Province,
  SearchParams,
  SavedListing,
  SearchResult,
  SignUpInput,
  University,
  UserRole,
} from "./schema.js";

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

/** One row from the search_listings function: the whole listing as a nested object plus its distance. */
export interface SearchResultRow {
  listing: ListingRow;
  distance_m: Numeric | null;
}

export function searchResultFromRow(row: SearchResultRow): SearchResult {
  return {
    listing: listingFromRow(row.listing),
    distanceKm: row.distance_m === null ? null : num(row.distance_m) / 1000,
  };
}

/** Named arguments for search_listings. Empty lists become null, which the function reads as "any". */
export interface SearchArgs {
  center_lat: number | null;
  center_lng: number | null;
  radius_m: number | null;
  min_price: number | null;
  max_price: number | null;
  min_bedrooms: number | null;
  min_bathrooms: number | null;
  property_types: string[] | null;
  required_amenities: string[] | null;
  is_furnished: boolean | null;
  allows_pets: boolean | null;
  sort_by: string;
  max_results: number;
}

export function searchToArgs({ center, radiusKm, filters, limit }: SearchParams): SearchArgs {
  const listOrNull = (items: string[]) => (items.length > 0 ? items : null);
  return {
    center_lat: center?.latitude ?? null,
    center_lng: center?.longitude ?? null,
    radius_m: center && radiusKm !== null ? radiusKm * 1000 : null,
    min_price: filters.minPrice,
    max_price: filters.maxPrice,
    min_bedrooms: filters.minBedrooms,
    min_bathrooms: filters.minBathrooms,
    property_types: listOrNull(filters.propertyTypes),
    required_amenities: listOrNull(filters.amenities),
    is_furnished: filters.furnished,
    allows_pets: filters.petsAllowed,
    sort_by: filters.sortBy,
    max_results: limit,
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

/** A favorites row with its listing embedded (`select('*, listing:listings(*)')`). null if the listing is gone. */
export function savedListingFromRow(row: FavoriteRow & { listing: ListingRow | null }): SavedListing | null {
  return row.listing ? { favorite: favoriteFromRow(row), listing: listingFromRow(row.listing) } : null;
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

/** Sign-up metadata, read by the handle_new_user trigger to create the profile. */
export interface SignUpMetadata {
  full_name: string;
  role: UserRole;
  university_id: string;
}

export function signUpMetadata(input: Pick<SignUpInput, "fullName" | "role" | "universityId">): SignUpMetadata {
  return {
    full_name: input.fullName,
    role: input.role,
    university_id: input.universityId,
  };
}

export interface ConversationRow {
  id: string;
  listing_id: string;
  student_id: string;
  landlord_id: string;
  created_at: string;
  last_message_at: string;
}

export function conversationFromRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    listingId: row.listing_id,
    studentId: row.student_id,
    landlordId: row.landlord_id,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
  };
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  listing_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export function messageFromRow(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    listingId: row.listing_id,
    content: row.content,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

/** The columns for a new message: it goes to whichever participant didn't send it. */
export function newMessageRow(conversation: Conversation, senderId: string, content: string) {
  return {
    conversation_id: conversation.id,
    listing_id: conversation.listingId,
    sender_id: senderId,
    receiver_id: senderId === conversation.studentId ? conversation.landlordId : conversation.studentId,
    content,
  };
}

/** One row from the my_conversations function. */
export interface InboxRow {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  other_user_id: string;
  other_name: string | null;
  other_avatar_url: string | null;
  last_message: string | null;
  last_sender_id: string | null;
  last_message_at: string;
  unread_count: number;
}

export function inboxEntryFromRow(row: InboxRow): InboxEntry {
  return {
    conversationId: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    listingImage: row.listing_image,
    otherUserId: row.other_user_id,
    otherName: row.other_name,
    otherAvatarUrl: row.other_avatar_url,
    lastMessage: row.last_message,
    lastSenderId: row.last_sender_id,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count,
  };
}
