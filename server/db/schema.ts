/** Drizzle view of the tables. The SQL migrations stay the source of truth; schema.test.ts fails if the two drift. */
import { boolean, date, integer, jsonb, numeric, pgTable, smallint, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

export const universities = pgTable("universities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: createdAt(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name"),
  universityId: text("university_id"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("student"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey(),
  maxRent: integer("max_rent"),
  housingTypes: text("housing_types").array().notNull().default([]),
  bedrooms: text("bedrooms"),
  lookingFor: text("looking_for"),
  wantsRoommates: boolean("wants_roommates").notNull().default(false),
  updatedAt: updatedAt(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  detailedDescription: text("detailed_description"),
  price: numeric("price").notNull(),
  propertyType: varchar("property_type", { length: 50 }).notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: numeric("bathrooms").notNull(),
  squareFeet: integer("square_feet"),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  province: varchar("province", { length: 50 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  amenities: text("amenities").array().notNull().default([]),
  images: text("images").array().notNull().default([]),
  isAvailable: boolean("is_available").notNull().default(true),
  availableFrom: date("available_from", { mode: "string" }),
  leaseTerm: varchar("lease_term", { length: 50 }),
  petsAllowed: boolean("pets_allowed").notNull().default(false),
  furnished: boolean("furnished").notNull().default(false),
  utilitiesIncluded: text("utilities_included").array().notNull().default([]),
  nearbyPlaces: text("nearby_places").array().notNull().default([]),
  distanceFromCampus: varchar("distance_from_campus", { length: 100 }),
  userId: uuid("user_id").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  neighborhood: varchar("neighborhood", { length: 100 }),
  universityId: text("university_id"),
});

export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  listingId: uuid("listing_id").notNull(),
  note: text("note"),
  createdAt: createdAt(),
  collectionName: varchar("collection_name", { length: 100 }),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull(),
  studentId: uuid("student_id").notNull(),
  landlordId: uuid("landlord_id").notNull(),
  createdAt: createdAt(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull(),
  receiverId: uuid("receiver_id").notNull(),
  listingId: uuid("listing_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: createdAt(),
  conversationId: uuid("conversation_id"),
});

export const userPresence = pgTable("user_presence", {
  userId: uuid("user_id").primaryKey(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  params: jsonb("params").notNull().default({}),
  createdAt: createdAt(),
});

export const viewingRequests = pgTable("viewing_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull(),
  studentId: uuid("student_id").notNull(),
  landlordId: uuid("landlord_id").notNull(),
  proposedAt: timestamp("proposed_at", { withTimezone: true, mode: "string" }).notNull(),
  message: text("message"),
  status: varchar("status", { length: 10 }).notNull().default("pending"),
  createdAt: createdAt(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull(),
  authorId: uuid("author_id").notNull(),
  rating: smallint("rating").notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const commuteCache = pgTable("commute_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").notNull(),
  mode: varchar("mode", { length: 10 }).notNull(),
  minutes: numeric("minutes", { precision: 6, scale: 1 }).notNull(),
  distanceM: integer("distance_m"),
  geometry: text("geometry"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const allTables = {
  universities,
  profiles,
  userPreferences,
  listings,
  favorites,
  conversations,
  messages,
  userPresence,
  savedSearches,
  viewingRequests,
  reviews,
  commuteCache,
};
