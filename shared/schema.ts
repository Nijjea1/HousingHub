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

export const SORT_OPTIONS = ["newest", "price-low", "price-high"] as const;
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

export const preferencesSchema = z.object({
  maxRent: z.number().int().min(0).nullable(),
  housingTypes: z.array(z.enum(PROPERTY_TYPES)),
  bedrooms: z.string().nullable(),
  lookingFor: z.string().nullable(),
  wantsRoommates: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

// Messages

export const messageSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  receiverId: z.string().uuid(),
  listingId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof messageSchema>;
