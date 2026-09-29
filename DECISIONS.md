# Decisions

## 2026-09-28: One build setup
Context: The repo had two build setups: a root Express + Vite config and a separate standalone Vite app in `client/` with its own package.json, Tailwind config and vercel.json. Production used the root one.
Decision: Keep the root setup and delete the `client/` configs. Remove Next.js, Drizzle, Neon, Passport, express-session and the Replit plugins, none of which were imported.
Tradeoff: The Express server stays but has no routes until phase 2.

## 2026-09-28: Restore the primary colour scale
Context: Pages use `text-primary-800` and similar in 64 places, but the root Tailwind config only defined `primary` as a single CSS variable, so the production CSS had none of those classes. The scale only existed in the unused `client/tailwind.config.js`.
Decision: Add `primary-50` to `primary-950` (the sky blue scale from the old client config) next to the existing `DEFAULT` and `foreground`.
Tradeoff: The live site will look different (bluer) after this ships, since those classes start working.

## 2026-09-28: SPA rewrites on Vercel
Context: `vercel.json` routed `/(.*)` to `/$1` and `/api/(.*)` to a file that is not a Vercel function, so a refresh on `/listings` could 404.
Decision: One rewrite of every path to `/index.html`. The `/api` route comes back in phase 2 with a real function.
Tradeoff: None known.

## 2026-09-29: Canada-wide data model, launching at McMaster
Context: The platform should serve every Canadian university, starting with McMaster.
Decision: A `universities` table keyed by a slug (`mcmaster`). Listings and profiles reference it. Listings use `province` (two-letter code check) and `postal_code` (format `A1A 1A1`) instead of US `state` and `zip_code`. McMaster is at 43.2609, -79.9192.
Tradeoff: US addresses are no longer valid. Old US test rows are kept by adding the province and postal code checks as NOT VALID.

## 2026-09-29: Versioned, re-runnable migrations
Context: The schema lived in a hand-run `db/schema.sql`, and we don't know exactly what state the hosted database is in.
Decision: Migrations in `supabase/migrations/` that use `if not exists`, `drop ... if exists` and guarded renames, so they upgrade a database built from the old file and also build a fresh one. The old file is kept as `supabase/tests/fixtures/legacy-schema.sql` to test the upgrade path.
Tradeoff: Migrations are longer than plain `create` statements.

## 2026-09-29: Row level security fixes
Context: `messages` had no row level security, so anyone with the public anon key could read every message. Update policies on `listings` and `favorites` had no `with check`, so an owner could move a row to another user.
Decision: Enable RLS on messages. Sender and receiver can read. Only the sender can insert. The receiver can update, and a column grant limits updates to `is_read`. Add `with check` to every update policy.
Tradeoff: None.

## 2026-09-29: Profiles and private preferences
Context: The app read and wrote a `users` table that did not exist. `auth.users` is not reachable through the API.
Decision: `profiles` (public: name, avatar, role, university) created by a sign-up trigger that reads the sign-up metadata, and a separate `user_preferences` table (owner only). Unknown university ids in the metadata are ignored instead of failing the sign-up.
Tradeoff: Two queries to load your own profile page.

## 2026-09-29: Drop unused tables and the deletion trigger
Context: `collections` and `collection_items` were never used; the app stores a collection name on the favorite. The `on_user_deletion` trigger referenced `collection_items.user_id`, which does not exist, so deleting a user failed.
Decision: Drop both tables and the trigger. Foreign keys with `on delete cascade` already remove a user's rows.
Tradeoff: Collections are tags, so a listing can be in one collection at a time.

## 2026-09-29: Storage limits
Context: Uploads had no size or type limits, and files went to `public/<user id>/`.
Decision: `listing-images` 5 MB, `profile-pictures` 2 MB, JPEG, PNG and WebP only. Files go to `<user id>/<uuid>.<ext>` and policies only allow writing inside your own folder. Up to 10 images per listing.
Tradeoff: Existing files under `public/` still display but can't be replaced by their owners.

## 2026-09-29: Test RLS policies with PGlite
Context: We want to prove the policies block what they should, without Docker or a hosted database.
Decision: Add `@electric-sql/pglite` (Postgres compiled to WebAssembly) as a dev dependency. `supabase/tests/rls.test.mjs` creates a small stand-in for Supabase's `auth` and `storage` schemas and roles, applies the migrations to both the legacy schema and a fresh database (twice, to prove they re-run cleanly), and runs 71 checks.
Tradeoff: The stand-in is not the real Supabase. It covers roles, `auth.uid()` and `storage.foldername()`, but not GoTrue or PostgREST behaviour.
