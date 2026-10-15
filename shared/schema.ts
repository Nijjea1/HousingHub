import { z } from "zod";

// The one definition of the app's data. Field names are camelCase here; the
// database uses snake_case and shared/mappers.ts converts between the two.

export const PROPERTY_TYPES = ["apartment", "house", "dormitory", "studio"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment",
  house: "House",
  dormitory: "Dormitory",
  studio: "Studio",
};

export const PROVINCES = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
} as const;
export type Province = keyof typeof PROVINCES;
const provinceCodes = Object.keys(PROVINCES) as [Province, ...Province[]];

export const AMENITIES = [
  "WiFi",
  "Laundry",
  "Parking",
  "Gym",
  "Air Conditioning",
  "Dishwasher",
  "Security",
  "Bike Storage",
] as const;

export const MAX_LISTING_IMAGES = 10;

/** Formats a Canadian postal code as "A1A 1A1"; returns the input unchanged if it can't. */
export function normalizePostalCode(value: string): string {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return compact.length === 6 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : value.trim();
}

// Universities

export const universitySchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  city: z.string(),
  province: z.enum(provinceCodes),
  latitude: z.number(),
  longitude: z.number(),
  isActive: z.boolean(),
});
export type University = z.infer<typeof universitySchema>;

// Listings

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

export const listingInputSchema = z.object({
  title: trimmed(5, 100, "Title"),
  description: trimmed(10, 1000, "Description"),
  detailedDescription: optionalText(5000),
  price: z.number({ invalid_type_error: "Price is required" }).positive("Price must be more than 0").max(20000),
  propertyType: z.enum(PROPERTY_TYPES),
  bedrooms: z.number({ invalid_type_error: "Bedrooms is required" }).int().min(0).max(20),
  bathrooms: z
    .number({ invalid_type_error: "Bathrooms is required" })
    .min(0)
    .max(20)
    .multipleOf(0.5, "Bathrooms must be a whole or half number"),
  squareFeet: z.number().int().positive().max(20000).nullable(),
  address: trimmed(3, 200, "Address"),
  neighborhood: optionalText(100),
  city: trimmed(2, 100, "City"),
  province: z.enum(provinceCodes),
  postalCode: z
    .string()
    .transform(normalizePostalCode)
    .pipe(z.string().regex(/^[A-Z]\d[A-Z] \d[A-Z]\d$/, "Enter a valid postal code, e.g. L8S 1C7")),
  universityId: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  amenities: z.array(z.string().trim().min(1).max(50)).max(30),
  images: z.array(z.string().url()).max(MAX_LISTING_IMAGES),
  utilitiesIncluded: z.array(z.string().trim().min(1).max(50)).max(20),
  nearbyPlaces: z.array(z.string().trim().min(1).max(100)).max(20),
  isAvailable: z.boolean(),
  availableFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
    .nullable(),
  leaseTerm: optionalText(50),
  petsAllowed: z.boolean(),
  furnished: z.boolean(),
  distanceFromCampus: optionalText(100),
});
export type ListingInput = z.infer<typeof listingInputSchema>;

export const listingSchema = listingInputSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Listing = z.infer<typeof listingSchema>;

// Browse filters. null means "any".

// "distance" needs a search center; without one it sorts like "newest".
export const SORT_OPTIONS = ["newest", "price-low", "price-high", "distance"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const listingFiltersSchema = z.object({
  minPrice: z.number().min(0).nullable(),
  maxPrice: z.number().min(0).nullable(),
  minBedrooms: z.number().int().min(0).nullable(),
  minBathrooms: z.number().min(0).nullable(),
  propertyTypes: z.array(z.enum(PROPERTY_TYPES)),
  amenities: z.array(z.string()),
  furnished: z.boolean().nullable(),
  petsAllowed: z.boolean().nullable(),
  sortBy: z.enum(SORT_OPTIONS),
});
export type ListingFilters = z.infer<typeof listingFiltersSchema>;

// The same filters as URL query strings: ?minPrice=500&type=house,studio&furnished=true&sort=price-low
const blankToNull = (v: unknown) => (v === undefined || v === "" ? null : v);
const queryNumber = z.preprocess(
  (v) => (blankToNull(v) === null ? null : Number(v)),
  z.number({ invalid_type_error: "Must be a number" }).min(0).nullable(),
);
const queryBoolean = z.preprocess(
  (v) => (v === "true" ? true : v === "false" ? false : blankToNull(v)),
  z.boolean({ invalid_type_error: "Use true or false" }).nullable(),
);
const queryList = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => (typeof v === "string" && v !== "" ? v.split(",") : []), z.array(item));

export const listingFiltersQuerySchema = z
  .object({
    minPrice: queryNumber,
    maxPrice: queryNumber,
    minBedrooms: queryNumber.pipe(z.number().int().nullable()),
    minBathrooms: queryNumber,
    type: queryList(z.enum(PROPERTY_TYPES)),
    amenities: queryList(z.string().trim().min(1)),
    furnished: queryBoolean,
    pets: queryBoolean,
    sort: z.enum(SORT_OPTIONS).default("newest"),
  })
  .transform(
    ({ type, pets, sort, ...rest }): ListingFilters => ({ ...rest, propertyTypes: type, petsAllowed: pets, sortBy: sort }),
  );

export const DEFAULT_LISTING_FILTERS: ListingFilters = {
  minPrice: null,
  maxPrice: null,
  minBedrooms: null,
  minBathrooms: null,
  propertyTypes: [],
  amenities: [],
  furnished: null,
  petsAllowed: null,
  sortBy: "newest",
};

// Location search: listings within radiusKm of a center, plus the browse filters.

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const MAX_SEARCH_RADIUS_KM = 50;
export const DEFAULT_SEARCH_LIMIT = 200;
export const MAX_SEARCH_LIMIT = 500;

export const searchParamsSchema = z.object({
  /** null searches everywhere and leaves distances empty. */
  center: coordinatesSchema.nullable(),
  /** null with a center means "any distance, but still measure it". */
  radiusKm: z.number().positive().max(MAX_SEARCH_RADIUS_KM).nullable(),
  filters: listingFiltersSchema,
  limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

export const DEFAULT_SEARCH_PARAMS: SearchParams = {
  center: null,
  radiusKm: null,
  filters: DEFAULT_LISTING_FILTERS,
  limit: DEFAULT_SEARCH_LIMIT,
};

export const searchResultSchema = z.object({
  listing: listingSchema,
  distanceKm: z.number().nullable(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

const queryCoordinate = (min: number, max: number) =>
  z.preprocess(
    (v) => (blankToNull(v) === null ? null : Number(v)),
    z.number({ invalid_type_error: "Must be a number" }).min(min).max(max).nullable(),
  );

const locationQuerySchema = z
  .object({
    lat: queryCoordinate(-90, 90),
    lng: queryCoordinate(-180, 180),
    radiusKm: queryNumber.pipe(z.number().positive().max(MAX_SEARCH_RADIUS_KM).nullable()),
    limit: queryNumber.pipe(z.number().int().min(1).max(MAX_SEARCH_LIMIT).nullable()),
  })
  .superRefine((v, ctx) => {
    if ((v.lat === null) !== (v.lng === null)) {
      ctx.addIssue({ code: "custom", path: [v.lat === null ? "lat" : "lng"], message: "Send lat and lng together" });
    }
    if (v.radiusKm !== null && v.lat === null) {
      ctx.addIssue({ code: "custom", path: ["radiusKm"], message: "A radius needs lat and lng" });
    }
  });

/** ?lat=43.26&lng=-79.92&radiusKm=2&maxPrice=900&sort=distance, the shape the browse URL and /api/search share. */
export const searchQuerySchema = z
  .intersection(listingFiltersQuerySchema, locationQuerySchema)
  .transform(
    ({ lat, lng, radiusKm, limit, ...filters }): SearchParams => ({
      center: lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null,
      radiusKm,
      filters,
      limit: limit ?? DEFAULT_SEARCH_LIMIT,
    }),
  );

// "Describe your place": a sentence in, search filters out.

export const MAX_DESCRIPTION_LENGTH = 300;

export const parseSearchRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Describe the place you're looking for")
    .max(MAX_DESCRIPTION_LENGTH, `Keep it under ${MAX_DESCRIPTION_LENGTH} characters`),
});

export const parsedSearchSchema = z.object({
  filters: listingFiltersSchema,
  /** Set when the sentence mentions a distance; measured from the user's campus. */
  radiusKm: z.number().positive().max(MAX_SEARCH_RADIUS_KM).nullable(),
  /** What was recognised, in plain words, e.g. ["2+ bedrooms", "Under $900"]. Empty when nothing was. */
  understood: z.array(z.string()),
});
export type ParsedSearch = z.infer<typeof parsedSearchSchema>;

// Favorites

export const favoriteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  listingId: z.string().uuid(),
  note: z.string().nullable(),
  collectionName: z.string().nullable(),
  createdAt: z.string(),
});
export type Favorite = z.infer<typeof favoriteSchema>;

/** A favorite together with the listing it points at, for the profile page. */
export const savedListingSchema = z.object({
  favorite: favoriteSchema,
  listing: listingSchema,
});
export type SavedListing = z.infer<typeof savedListingSchema>;

// Profiles

export const USER_ROLES = ["student", "landlord"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const profileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  universityId: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(USER_ROLES),
  createdAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

export const profileUpdateSchema = z.object({
  fullName: trimmed(1, 100, "Name"),
  universityId: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const MIN_PASSWORD_LENGTH = 8;

export const signUpSchema = z
  .object({
    fullName: trimmed(1, 100, "Name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
    confirmPassword: z.string(),
    role: z.enum(USER_ROLES),
    universityId: z.string().min(1, "Choose a university"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const preferencesSchema = z.object({
  maxRent: z.number().int().min(0).nullable(),
  housingTypes: z.array(z.enum(PROPERTY_TYPES)),
  bedrooms: z.string().nullable(),
  lookingFor: z.string().nullable(),
  wantsRoommates: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

// Messages

export const MAX_MESSAGE_LENGTH = 2000;

export const conversationSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  /** Whoever asked about the listing. */
  studentId: z.string().uuid(),
  /** The listing's owner. */
  landlordId: z.string().uuid(),
  createdAt: z.string(),
  lastMessageAt: z.string(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  receiverId: z.string().uuid(),
  listingId: z.string().uuid(),
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

/** One row of the inbox: a conversation as the signed-in user sees it. */
export const inboxEntrySchema = z.object({
  conversationId: z.string().uuid(),
  listingId: z.string().uuid(),
  listingTitle: z.string(),
  listingImage: z.string().nullable(),
  otherUserId: z.string().uuid(),
  otherName: z.string().nullable(),
  otherAvatarUrl: z.string().nullable(),
  lastMessage: z.string().nullable(),
  lastSenderId: z.string().uuid().nullable(),
  lastMessageAt: z.string(),
  unreadCount: z.number().int().min(0),
});
export type InboxEntry = z.infer<typeof inboxEntrySchema>;

export const messageInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write a message first")
    .max(MAX_MESSAGE_LENGTH, `Messages can be at most ${MAX_MESSAGE_LENGTH} characters`),
});
export type MessageInput = z.infer<typeof messageInputSchema>;

export const startConversationSchema = messageInputSchema.extend({
  listingId: z.string().uuid("Not a valid listing id"),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;
