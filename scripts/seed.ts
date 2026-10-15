/** Creates or resets the demo accounts and their sample data. Safe to run repeatedly. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../shared/demo";
import {
  conversationFromRow,
  listingToRow,
  newMessageRow,
  signUpMetadata,
  type ConversationRow,
} from "../shared/mappers";
import { listingInputSchema, type UserRole } from "../shared/schema";
import { createNominatimGeocoder } from "../server/geocode";
import { SEED_LISTINGS } from "./seed-data";

const UNIVERSITY_ID = "mcmaster";

function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing ${names.join(" or ")} in .env`);
}

async function findUserId(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
}

/** Creates the demo user, or resets its password and profile if it already exists. */
async function upsertDemoUser(admin: SupabaseClient, role: UserRole): Promise<string> {
  const { email, fullName } = DEMO_ACCOUNTS[role];
  const metadata = signUpMetadata({ fullName, role, universityId: UNIVERSITY_ID });

  let id = await findUserId(admin, email);
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    id = data.user.id;
  }

  // The trigger only fills the profile on insert, so reset it explicitly.
  const { error } = await admin
    .from("profiles")
    .update({ full_name: metadata.full_name, role: metadata.role, university_id: metadata.university_id, avatar_url: null })
    .eq("id", id);
  if (error) throw error;
  return id;
}

const DEMO_MESSAGES = (studentId: string, landlordId: string): Array<[string, string]> => [
  [studentId, "Hi, is this place still available for September?"],
  [landlordId, "Yes, it is. Happy to set up a viewing this week if you'd like."],
];

async function main() {
  const admin = createClient(
    requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const landlordId = await upsertDemoUser(admin, "landlord");
  const studentId = await upsertDemoUser(admin, "student");

  // Deleting the landlord's listings also removes favorites on them (on delete cascade).
  const { error: deleteError } = await admin.from("listings").delete().eq("user_id", landlordId);
  if (deleteError) throw deleteError;

  // Seed rows skip the API, so they're geocoded here the same way. Nominatim allows 1 request per second.
  const geocode = createNominatimGeocoder({
    userAgent: process.env.GEOCODER_USER_AGENT ?? "LetMeKnock/0.2 (student housing)",
  });
  const rows = [];
  for (const [i, listing] of SEED_LISTINGS.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const coords = await geocode(listing);
    if (!coords) console.warn(`No coordinates for "${listing.title}"; it won't appear in radius searches or on the map.`);
    const input = listingInputSchema.parse({ ...listing, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null });
    rows.push({ ...listingToRow(input), user_id: landlordId });
  }
  const { data: inserted, error: insertError } = await admin.from("listings").insert(rows).select("id");
  if (insertError) throw insertError;

  const { error: clearFavoritesError } = await admin.from("favorites").delete().eq("user_id", studentId);
  if (clearFavoritesError) throw clearFavoritesError;
  const { error: favoriteError } = await admin
    .from("favorites")
    .insert(inserted.slice(0, 2).map(({ id }) => ({ user_id: studentId, listing_id: id })));
  if (favoriteError) throw favoriteError;

  // The old demo conversation went with the listings (on delete cascade). Start a fresh one so the
  // inbox isn't empty; the landlord's reply is unread, so the student sees the badge.
  const { data: convRow, error: conversationError } = await admin
    .from("conversations")
    .insert({ listing_id: inserted[0].id, student_id: studentId, landlord_id: landlordId })
    .select()
    .single();
  if (conversationError) throw conversationError;
  const conversation = conversationFromRow(convRow as ConversationRow);
  for (const [senderId, content] of DEMO_MESSAGES(studentId, landlordId)) {
    const { error } = await admin.from("messages").insert(newMessageRow(conversation, senderId, content));
    if (error) throw error;
  }

  console.log(`Demo landlord ${DEMO_ACCOUNTS.landlord.email}: ${inserted.length} listings`);
  console.log(`Demo student  ${DEMO_ACCOUNTS.student.email}: 2 favorites, 1 conversation`);
  console.log(`Password for both: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
