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

## 2026-10-01: Vitest for unit tests
Context: Phase 1's hand-written piece (`applyFilters`) and the mappers need tests, and `node:test` can't import our TypeScript or the `@shared` alias without extra setup.
Decision: Add `vitest@^2.1.9` as a dev dependency, brought forward from phase 4. Version 2 targets Vite 5, so it reuses our `vite@5.4.18`. `vitest.config.ts` merges `vite.config.ts` for the aliases and only collects `client/src/**/*.test.ts` and `shared/**/*.test.ts`. `npm test` runs it; database tests stay on `npm run test:db`.
Tradeoff: Two test commands until phase 4 decides whether to fold the database suite into Vitest.

## 2026-10-01: Browse filters as one pure function
Context: Filtering lived in a `useEffect` in `Listings.tsx` against the old listing type. Bathrooms "3+" was silently ignored (`Number("3+")` is NaN) and bathrooms "1" hid 1.5-bath listings because it used exact equality.
Decision: `ListingFilters` is defined once in `shared/schema.ts` with null meaning "any", and `applyFilters` in `shared/filters.ts` is a pure function so the phase 2 API can reuse it. Bedrooms and bathrooms are minimums ("2+"). Amenities must all match, ignoring case. Sorts are newest (default), price low to high, price high to low. Distance and move-in date are left out: the spec's phase 1 filters don't include them and distance needs phase 3 coordinates.
Tradeoff: "Exactly 2 bedrooms" is no longer possible. Filtering runs in the browser over every listing until phase 3 moves search into Postgres.

## 2026-10-01: Browse page trimmed to the spec
Context: `Listings.tsx` fell back to mock listings on any error, and the sidebar had features outside the phase 1 spec: a distance slider in miles, saved filters in localStorage (stored in the old filter shape, so loading them would crash), and search suggestions that offered "luxury X" for any query. The search history dialog could never open.
Decision: Errors show a message and a retry button. The page owns the filter state and the sidebar is a controlled component. Filters apply immediately with no Apply button. Removed the distance slider (phase 3), saved filters, the keyword search box, suggestions and history (natural-language search is phase 6).
Tradeoff: No keyword search until phase 6. Saved filters would need a new design if they come back.

## 2026-10-01: Listing detail from real data
Context: `ListingDetail.tsx` read mock data with a fake 500 ms delay, showed an invented phone number, response rate and tour booking, and the route was not registered.
Decision: `/listings/:id` uses `useListing` and shows the landlord's public profile through `useProfile`. Owners see an Edit listing button. Removed the phone, email, response rate, tour form, share button, similar listings and the message button (messaging is phase 5, viewing bookings are out of scope). Date-only values like `available_from` are parsed as local time, since `new Date("2026-09-01")` is UTC midnight and showed the day before in Ontario.
Tradeoff: The page has no way to contact the landlord until phase 5.

## 2026-10-01: Sign-up sends profile data, demo logins
Context: The sign-up form collected a name and a free-text university but only sent email and password, so every profile had no name, no university and the student role. The page also had controls that did nothing: remember me, forgot password, terms links and Google and Apple buttons pointing at `#`.
Decision: `signUpSchema` in `shared/schema.ts` validates the form (password at least 8 characters, confirm must match, university required). `signUpMetadata` in `shared/mappers.ts` sends `full_name`, `role` and `university_id`, the keys the `handle_new_user` trigger reads. University is a dropdown from the `universities` table. If the project requires email confirmation, the page says so instead of redirecting to an empty profile. Removed the controls that did nothing. Two demo logins (`demo-student@example.com`, `demo-landlord@example.com`, password `letmeknock-demo`) live in `shared/demo.ts`; `example.com` is reserved, so no real inbox receives mail.
Tradeoff: Demo passwords are public, so anyone can change the demo data or password. RLS limits them to the demo accounts' own rows, and re-running the seed resets both. A scheduled reset waits until abuse actually happens. No password reset flow yet.

## 2026-10-01: Seed script and demo reset
Context: Phase 1 needs sample listings near McMaster and two demo accounts, and the demo accounts need a way to be reset since their password is public.
Decision: `npm run seed` (`scripts/seed.ts`) uses the service role key to create or reset both demo users (password, confirmed email, profile), replaces the demo landlord's listings with the 8 in `scripts/seed-data.ts`, and gives the demo student 2 favorites. It is idempotent, so running it again is the reset. Addresses are real street names near campus with no house numbers, so no listing points at a real home. Coordinates stay null until phase 2 geocoding. `.env` is loaded with Node's `--env-file`, so no dotenv dependency.
Tradeoff: The service role key bypasses RLS, so it lives only in a local `.env` and never gets a `VITE_` prefix. Seed listings have no photos. The script is only tested indirectly: its data is checked against `listingInputSchema`, but the Supabase calls need a real project.

## 2026-10-01: README describes what exists
Context: The README listed Firebase auth, Socket.io, Drizzle, AI matching, a rent calculator and Firebase environment variables, none of which are in the code, and its setup steps could not produce a working app.
Decision: Replace it with what works today, the demo logins, the real stack and setup steps (env, migrations, seed, dev). Planned features are listed as roadmap.
Tradeoff: Shorter and less impressive until phase 6 adds the architecture diagram and measured numbers.

## 2026-10-01: API acts as the caller, not as an admin
Context: Phase 2 moves listing reads and writes behind an Express API. The API could use the service role key (bypasses RLS) or the caller's own JWT.
Decision: The API verifies the bearer token with `supabase.auth.getUser` and then queries Supabase with the anon key plus the caller's JWT, so every RLS policy still applies. Routes also check ownership themselves (403) before writing. A token that fails verification is a 401, never downgraded to anonymous. No new dependencies: no `jose`, no `supertest`.
Tradeoff: `getUser` is a network round trip to Supabase on every authenticated request. Verifying the JWT locally would be faster but needs a new dependency and key handling.

## 2026-10-01: API built from injected dependencies
Context: Route tests should not need a real Supabase project, network or geocoder.
Decision: `createApp(deps)` in `server/app.ts` takes `verifyToken`, `listingsFor(token)` and `geocode`. `server/supabase-deps.ts` supplies the real ones; `server/test-helpers.ts` supplies in-memory fakes that mimic RLS ownership. API tests start the app on a random port and use `fetch`.
Tradeoff: The fakes can drift from Supabase's behaviour. The real RLS rules are still covered by `npm run test:db`, but the Supabase-backed store has no automated test.

## 2026-10-01: Rate limits
Context: Phase 2 asks for rate limiting.
Decision: Fixed-window limiter in `server/rate-limit.ts`. Reads: 120 per minute per IP (or per user when signed in). Writes: 20 per minute per user. Over the limit returns 429 with `Retry-After`.
Tradeoff: Counts live in memory per server instance. On Vercel each instance has its own counts and cold starts reset them, so this stops bursts from one client but is not a hard global limit. A shared store (Redis) would fix that. A fixed window also allows up to twice the limit across a window boundary.

## 2026-10-01: Geocoding with Nominatim
Context: Spec open question 2. Phase 3's radius search needs coordinates.
Decision: OpenStreetMap's Nominatim, structured query restricted to Canada, with a `User-Agent` naming the app as its usage policy requires. Called on create and only when an address field changes on update. 4 second timeout. Failure or no match saves the listing with null coordinates. Coordinates always come from the geocoder; values sent by the client are ignored. One manual request for "Sterling St, Hamilton, ON, L8S 4H9" returned 43.2620, -79.9106 in about 850 ms (single sample, not a benchmark).
Tradeoff: Policy limit of 1 request per second and no uptime guarantee. Street-only addresses resolve to a point on the street, not a building. Data requires "© OpenStreetMap contributors" attribution wherever it is shown.

## 2026-10-01: Filters travel as a query string
Context: The API needs the browse filters, and phase 3 will put them in the page URL.
Decision: `listingFiltersQuerySchema` in `shared/schema.ts` parses `?minPrice=500&type=house,studio&furnished=true&sort=price-low` into `ListingFilters`, and `filtersToQuery` in `shared/filters.ts` writes it. Non-numbers are a 400 ("Must be a number") instead of being ignored. The browse page now sends filters to `GET /api/listings` and the server runs `applyFilters`. `?mine=true` (signed in) returns the caller's listings including unavailable ones, for My listings.
Tradeoff: Every filter change is a request (typing a price sends one per keystroke). React Query keeps the previous results on screen while the next ones load.

## 2026-10-01: API deploy shape
Context: `package.json` has `"type": "module"`, so Vercel runs the compiled function under Node's ES module loader, which needs file extensions on relative imports and does not know the `@shared` alias.
Decision: `api/index.ts` exports `createApp(createSupabaseDeps())`. Everything it imports uses relative `.js` imports. `vercel.json` rewrites `/api/(.*)` to the function before the SPA fallback. Checked locally by compiling with `tsc` and running the output under Node: health 200, bad id 400, unknown route 404. `npm run dev` now loads `.env` with `--env-file` and serves the same app plus Vite. Removed the old request logger, which ran after the API routes and never fired.
Tradeoff: Not yet confirmed on a real Vercel deploy.

## 2026-10-14: Build the remaining phases before the learning pass
Context: Paramveer asked to finish the whole project first and do the teaching, quizzes and manual steps at the end.
Decision: Phases 3 to 6 are built without per-step check questions or a hand-written piece per phase. Those pieces go in the learning guide's weak spots. Dependencies approved for this: Leaflet, react-leaflet, leaflet.markercluster, and `@electric-sql/pglite-postgis` (dev, which moved `@electric-sql/pglite` to 0.5.9). Not approved: Playwright and ESLint, so phase 4 CI runs type check, unit, API and database tests only. Phase 6 search parses sentences with rules (no model provider, no cost). Offline emails go through Resend's HTTP API. The search box is called "Describe your place".
Tradeoff: A large learning backlog at the end, and no end-to-end browser tests.

## 2026-10-14: Radius search in PostGIS
Context: Phase 3 needs "places within X km of campus" and moves search from JavaScript into Postgres.
Decision: Migration `20261014000000_location_search.sql` enables PostGIS, adds `location geography(Point, 4326)` generated from latitude and longitude (the app never writes it), a GiST index on it, and `search_listings(...)`, which runs the radius, browse filters, sort (newest, price, and the new "distance") and a limit (default 200, max 500) in one call. Distances use a sphere (`use_spheroid = false`) so they match the haversine reference `searchInMemory` in `shared/search.ts`. The function is plpgsql so each call is planned with real argument values and `center is null or st_dwithin(...)` folds to an indexable `st_dwithin`. `GET /api/listings` now goes through the same search with no center, capped at 500 results. Sort ties break by newest, then id, in both SQL and TypeScript.
Tradeoff: The sphere is off from the WGS84 spheroid by under 0.5% (about 10 m at 2 km). The filter rules exist twice (SQL and TypeScript); a parity test runs 200 seeded random searches over 400 listings and requires identical ids, order and distances (within 1 mm). Deliberately breaking the SQL id tie-break or the amenity case rule makes it fail.

## 2026-10-14: Spatial index measurements
Context: Phase 3 done check: query time before and after the index.
Decision: `npm run bench:search` (PGlite with PostGIS 3.6, WASM, on Paramveer's laptop, Node 24.11). 50,000 listings within 50 km of McMaster, seed 42. Query: 2 km around McMaster, nearest first, up to 200 results (43 matches). Blocks alternate no index / index / no index / index, 100 timed runs each after 10 warm-ups. No index: median 21.02 ms, mean 21.34 ± 0.27 ms (95% CI, n=200). GiST index: median 0.91 ms, mean 0.94 ± 0.02 ms (n=200). The plan shows a Bitmap Index Scan on `idx_listings_location`.
Tradeoff: These are local PGlite numbers, not Supabase. The live database timing is still to be measured with EXPLAIN ANALYZE once the migration runs there.

## 2026-10-14: Search API, URL state and the map
Context: Phase 3 asks for `GET /api/search`, a Leaflet map with clustering and pan-to-search, and filters stored in the URL.
Decision: `GET /api/search?lat&lng&radiusKm&limit&<filters>` returns `{ results: [{ listing, distanceKm }] }`, read-rate-limited like `/api/listings`. Half a center or a radius without a center is a 400. The browse URL and the API share `searchQuerySchema`; a URL that fails to parse falls back to the default search. Filter changes replace the history entry instead of pushing. When the URL has no center, the list and map measure from the user's university (else McMaster), so distances and "Nearest first" always work. The distance menu offers 1, 2, 5 and 10 km from campus. The map uses OpenStreetMap tiles with attribution, price-pill markers clustered by `leaflet.markercluster` (radius 50 px), and "Search this area" sets the center to the map center and the radius to the center-to-corner distance, rounded up to 0.1 km and capped at 50 km. Listings without coordinates are counted under the map list and stay in the list view.
Tradeoff: Before universities load, the first search goes out without a center and repeats once the campus is known (two requests). OpenStreetMap's public tile servers are for light use; heavy traffic would need a tile provider. The cluster layer rebuilds all markers when the selection changes, fine up to the 500-result cap. Checked by hand in Chrome against a local server with fake listings (map, clusters, circle, search this area, list filters); not covered by automated UI tests.

## 2026-10-14: Continuous integration
Context: Phase 4 asks for CI that runs type check, lint, unit and database tests, with Playwright on pull requests. Playwright and ESLint were not approved as dependencies.
Decision: `.github/workflows/ci.yml` runs on every push to main and every pull request, on Ubuntu with Node 22: `npm ci`, type check, unit and API tests, database tests (PGlite with PostGIS) and a production build. A newer push cancels the older run on the same branch. `npm run ci` runs the same steps locally: 30 s on Paramveer's laptop. Checked that the lockfile includes the Linux native packages for esbuild and Rollup. Done check, run locally with `npm run ci`: removing the ownership check from `server/listings.ts` fails 2 API tests (PATCH and DELETE on someone else's listing returned 404 instead of 403) and the script exits 1.
Tradeoff: No lint step and no browser tests, so UI regressions (like the two map bugs found by hand in phase 3) are not caught automatically. The workflow itself has not run on GitHub yet; the first push will be its real test. Since commits go straight to main, CI reports after the fact instead of blocking a merge.

## 2026-10-14: Conversations and messages
Context: Phase 5 needs one thread per listing between a student and its landlord, and "a third account cannot read the conversation".
Decision: Migration `20261014010000_conversations.sql` adds `conversations` (unique per listing and student; `student_id` is whoever asks, `landlord_id` must be the listing's owner, enforced in the insert policy) and `messages.conversation_id`. Only participants can read either. A message insert must come from a participant, go to the other one and name the conversation's listing. Users cannot update or delete conversations; a `security definer` trigger bumps `last_message_at`. Older messages are grouped into conversations when one side owns the listing; messages between two non-owners stay unattached and never show in the app (the database test caught the first version of this backfill attaching them). `my_conversations()` returns the inbox in one query (other person, listing, last message, unread count) and runs as the caller. The database suite grew from 77 to 121 checks.
Tradeoff: One conversation per listing per student, so a student can't open two separate threads about the same place. Messages can't be edited or deleted.

## 2026-10-14: Sending through the API, reading from Supabase
Context: Messages could be written straight from the browser (RLS already guards them) or through the API.
Decision: Sending goes through `POST /api/conversations` and `POST /api/conversations/:id/messages` (sign-in, Zod validation, 1 to 2000 characters, write rate limit, acting as the caller so RLS still applies), because the server has to decide whether to email the receiver. Reading the inbox and threads, marking read and live updates go browser to Supabase. Live updates use one Supabase Realtime channel per signed-in user on `messages`; Realtime applies the select policy, so only the user's own conversations arrive. Each event appends to the open thread and refreshes the inbox and the unread badge.
Tradeoff: Messaging uses two paths (API for writes, Supabase for reads). Realtime needs the tables in the `supabase_realtime` publication, which the migration adds only where it exists (Supabase, not the test database), so live updates are untested locally.

## 2026-10-14: Offline message emails
Context: Phase 5 asks to email the receiver when they're offline. Approved: Resend through its HTTP API, no SDK.
Decision: The browser records `user_presence.last_seen_at` every 60 s while a tab is visible (owner-only table). After a send, the API emails the receiver only when (a) this is their first unread message in the conversation, so a burst of messages sends one email, and (b) they haven't been seen for 5 minutes. The email has the sender's name, the listing title, the first 300 characters (HTML-escaped) and a link to `/inbox/<id>`, with a 4 s timeout. Email failures are logged and never fail the send. Looking up the receiver's email and last-seen time needs the service role key on the server, so emails turn on only when `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL` and `APP_URL` are all set.
Tradeoff: This puts the service role key in the API's environment, which the 2026-10-01 seed entry said to avoid. It never reaches the browser and is used only for four read-only lookups in `server/supabase-deps.ts`, but a bug in that code would run with full access. Paramveer to decide whether to add it on Vercel. Sending waits for the email (up to 4 s) because a serverless function may stop once it responds.

## 2026-10-14: "Describe your place" with rules, not a model
Context: Phase 6 asks for `POST /api/search/parse` to turn a sentence into filters. Spec open question 4: Paramveer chose no cost, so no model provider, and the name "Describe your place".
Decision: `parseSearch` in `shared/parse-search.ts` reads, in a fixed order, distance (km or m, "N min walk" at 0.08 km per minute, "walking distance" 1.5 km, "near campus" 2 km, capped at 50 km), bedrooms, bathrooms (to the nearest half), prices (only numbers of $100 or more count as rent, "1.2k" and "1,200" both work, a lone "$900" is a budget), property type words (condo is an apartment, bachelor is a studio), furnished, pets ("no pets" is ignored), amenity synonyms and sort words. Each match is blanked out so one number can't be read twice. The API validates both the request (1 to 300 characters) and its own output with Zod. A distance is measured from the user's campus. If nothing is recognised, the page says so and shows an example. 37 parser tests.
Tradeoff: Fixed phrasing only: "cheap", "close", per-person rents ("$800 each") and neighbourhood names aren't understood. Rules are predictable, free and testable, but every new phrasing needs a new rule.

## 2026-10-14: Search chips and the home search
Context: Phase 6 asks for filters as removable chips. The home page search sent `price=500-1000`, `bedrooms=4+` and `type=Apartment`, none of which the URL schema accepts, so the browse page silently showed everything.
Decision: `searchChips` in `client/src/lib/chips.ts` turns the current search into chips ("Within 2 km of McMaster", "Under $900", "2+ bedrooms") that each remove one filter, plus "Clear all", on the list and map pages. The home search is now the "Describe your place" box and opens `/listings` with real filters. Sort labels live in `chips.ts` and the sidebar reuses them.
Tradeoff: The home page no longer has dropdowns for price and rooms; those stay in the browse page sidebar.

## 2026-10-14: Remove claims the product can't back
Context: Rule 4 (no invented claims) and spec section 8 (measured numbers only). The landing page showed three invented student testimonials with photos that didn't exist, "Join thousands of students who have found their perfect housing", and "Verified listings" and "Secure booking process" in several places. Nothing is verified, there are no users yet, and bookings are out of scope.
Decision: Removed the testimonials section and its components. Rewrote the CTA, the six feature cards, the hero card and the About page's highlights to describe features that exist. "Our future plans" now lists the spec's roadmap (roommate matching, viewing scheduler, digital leasing, virtual tours, more campuses, support assistant).
Tradeoff: Less social proof on the landing page until there are real users to quote.

## 2026-10-14: Lighthouse pass
Context: Phase 6 asks for Lighthouse 90+ on performance and accessibility.
Decision: Measured locally with Lighthouse 13.5.0 run through `npx` (not added to package.json), against the production build served with gzip and fake API data, 3 runs per page, mobile (default, simulated slow 4G) and desktop presets. Changes: lazy-load every route except Home and Listings; load Framer Motion's animation features after first render (`LazyMotion` with `m` components, `strict`); load Font Awesome without blocking render; remove `maximum-scale=1` so pinch zoom works; add a meta description; darken text from primary-600 to primary-700 and footer text from gray-500 to gray-400 for contrast; label the mobile menu button and two dropdowns; fix heading order; cap the listing card fade-in stagger (card 100 used to wait 10 s); skeleton cards instead of a full-page spinner on the browse page.
Main JS chunk: 880.13 kB (252.99 kB gzip) before, 483.29 kB (143.25 kB gzip) after; JS needed for first render (main plus React vendor chunk) 298.6 kB gzip before, 188.9 kB after.
Mobile, before (accessibility 84 on all three): performance home 71/71/77, listings 73/74/74, map 68/86/74. After: accessibility 100/100/100 on all three; performance home 71/77/77 (median LCP 5.40 s), listings 76/92/75 (4.31 s), map 89/70/80 (4.56 s).
Desktop, after: accessibility 100 on all three; performance home 98/98/98, listings 98/98/100, map 98/93/96.
Tradeoff: Mobile performance does not reach 90. Unthrottled, the browser paints `/listings` at 639 ms, but on Lighthouse's simulated phone about 189 kB of gzip JS has to download and run before anything renders, because the app renders only in the browser. Getting to 90 on mobile likely needs prerendered HTML for the landing pages or a smaller dependency set (Framer Motion in the navbar and hero, Radix, supabase-js all load up front). Shrinking the API response from 82 kB to 7 kB made no difference, so data size is not the cause. Not yet measured on the live Vercel site, which serves Brotli over a CDN.

## 2026-10-14: Geocode without the postal code, and geocode the seed
Context: Checking the README's demo path, every seed address came back from Nominatim with no result. OpenStreetMap has almost no Canadian postal codes, and a structured query that includes `postalcode` returns nothing, so since phase 2 every listing created through the API would have been saved without coordinates and never appeared in a radius search or on the map. (The 2026-10-01 entry's sample result must have come from a different query than the code sends.) Separately, the seed inserted listings with null coordinates because it writes to the database directly, skipping the API's geocoder.
Decision: The geocoder sends street, city, province and country only; postal code changes no longer trigger re-geocoding. `npm run seed` geocodes each listing with the same geocoder, 1.1 s apart (Nominatim's limit is 1 request per second), and warns about any address it can't place. Checked live against Nominatim: all 8 seed streets resolve, between 0.66 and 1.73 km from McMaster.
Tradeoff: Without a house number or postal code, a listing's point is somewhere on its street, so long streets (Main St W, King St W) can be off by a kilometre or more. Seeding now takes about 9 s longer and needs the network.

## 2026-10-14: Review pass: bugs fixed
Context: A full review of the code from all phases before calling it finished.
Decision: Fixed:
- Profile showed a stock photo and "State University, 2025" when data was missing, built favorites from "every available listing" (so unavailable or 500th-plus favorites disappeared), and had buttons that did nothing (Sort, Share, Update preferences). Rewritten: real profile data, saved listings fetched with their listing in one query (`useSavedListings`, `favorites.select('*, listing:listings(*)')`), a collection menu per saved listing, and a preferences form with checkboxes instead of free text that silently dropped "House".
- "New collection" was a no-op (`createCollection` did nothing, since collections are tags on favorites). Replaced with `setCollection(listingId, name | null)`.
- The note box on a listing card was filled once at mount; if favorites hadn't loaded yet, saving overwrote the real note with an empty one. Now read when the dialog opens.
- Refreshing `/edit-listing/:id` sent signed-in users to sign-in, because the page redirected while the session was still loading, and it called toast and navigate during render. `RequireAuth` now waits for the session on Profile, My listings, Create and Edit.
- New listings were never linked to a university. The form has a university picker defaulting to the landlord's own, an "available to rent" toggle, keeps existing photos on edit, checks the 10-photo limit and file types when photos are chosen, validates before uploading (no orphaned files) and shows errors under the field they belong to, including field errors from the API.
- My listings showed "No listings yet" when the request failed, and photo-less cards overlapped their buttons. Added loading and error states, "Hidden from search" and "no map location" notices, and a confirm dialog instead of `window.confirm`.
- Four pages sat under the fixed navbar. FAQ answers described the app before messaging and search existed; a guidelines tip suggested paying months of rent upfront, which Ontario law doesn't require and is a common scam pattern. Removed dead data and components.
Tradeoff: The signed-in pages (Profile, My listings, Inbox) were type-checked but not run in a browser, because that needs a real Supabase project. They are on the live-check list.

## 2026-10-14: Review pass: performance
Context: Same review, looking for wasted work.
Decision:
- The list and map fired a search before the campus was known and again after. Searches now wait for `useCampus().ready` (checked in Chrome: 1 search request on load).
- The map rebuilt every marker on each render because the filtered results were a new array each time. Results are memoised, markers are added in one bulk call, and selecting a listing restyles only the old and new marker (checked: 13 of 14 marker elements untouched after a selection).
- Opening a thread could send "mark read" twice. The thread cache is updated optimistically, and each message is only tried once, so a failing update can't loop through the refetch.
- Every signed-in API request waited on a call to Supabase to verify the token. Verified tokens are cached for up to 60 s and never past the token's own expiry; failures are never cached (5 tests). Signed-out requests share one Supabase client instead of creating one per request.
- Vercel now sends `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` (file names are content hashes). Messages are the only table in the Realtime publication; conversations had no subscribers.
Tradeoff: A token revoked by signing out stays accepted by the API for up to 60 s. Supabase JWTs already stay valid until they expire, so the database would accept it anyway.

## 2026-10-14: Open decisions settled
Context: Paramveer asked me to decide the three open questions, choosing the more modern option.
Decision: (1) Mobile performance: prerender the public pages at build time (next entry). (2) Offline emails: on. The service role key goes in the API's environment on Vercel along with the Resend settings; it stays server-only and is used only for the four read-only lookups in `server/supabase-deps.ts`. (3) The invented testimonials and unbacked claims stay removed; the footer's made-up address, phone number, email, "since 2023" and dead links were removed in the same spirit. The spec's architecture section and open questions were updated to match.
Tradeoff: Emails add a service with its own key and a verified sending domain to set up and keep paid up.

## 2026-10-14: Prerendered public pages
Context: Mobile Lighthouse performance was 70 to 92 because the app rendered only in the browser: a phone saw nothing until about 189 kB of gzip JS downloaded and ran.
Decision: `npm run build` now also builds `client/src/entry-server.tsx` for Node and runs `scripts/prerender.mjs`, which renders `/`, `/listings`, `/about`, `/resources`, `/signin` and `/signup` to static HTML (2 to 17 ms each, 11 to 22 kB) with React's `renderToPipeableStream`, waiting for lazy pages (`onAllReady`). Every other route gets `app.html`, the empty shell. `main.tsx` hydrates only when the HTML was rendered for exactly this URL; with a query string it renders fresh to avoid hydration mismatches. The map isn't prerendered because Leaflet needs `window` when it loads. The home headline, text and buttons now render in their final state instead of fading in from opacity 0, and the hero photo uses `srcset` (640, 1280, 2000 px) with `fetchpriority="high"`. Vercel rewrites point each prerendered path at its `index.html` and everything else at `app.html`. Checked in Chrome: no hydration errors on any prerendered page, pages interactive after hydration, filtered URLs render fresh. Guarded by 3 tests that server-render the pages.
Measured with a controlled A/B: the same build served with prerendered HTML or with the empty shell, Lighthouse 13.5 mobile with real throttling (`--throttling-method=devtools`: slow 4G, 4x CPU), 3 runs each. Home: performance 88/88/88 to 98/98/97, LCP median 2,904 ms to 1,873 ms. Listings: 89/84/89 to 99/99/97, LCP median 3,005 ms to 1,747 ms. Unthrottled observed LCP on home went from 1,981 ms (before this change) to 240 ms. Lighthouse's default simulated mode still reports 74 to 93 on mobile; it estimates from a fast trace and charges the early module-script download to the first paint, so the devtools-throttled runs are the better measure for a prerendered page. Desktop: 94 to 98, accessibility 100 everywhere.
Tradeoff: Two builds instead of one, and prerendered pages must render without browser APIs (enforced by the tests). Prerendered pages show listing skeletons rather than listings, because data still loads in the browser. A signed-in user briefly sees "Sign in" in the navbar until the session loads, as before.

## 2026-10-14: Sentence case and consistent copy
Context: The style rule says UI copy is sentence case; 31 headings across the older pages were Title Case. The navbar highlighted "Listings" on every page, and the 404 page told users to "add the page to the router".
Decision: Converted the 31 headings with a script that keeps proper nouns and acronyms (McMaster, LetMeKnock, FAQ, Ontario). The navbar highlights the current section, including sub-pages, and marks it with `aria-current`. Rewrote the 404 page with links to listings and home.
Tradeoff: None.

## 2026-10-14: Sign-in returns you where you were
Context: Signing in always landed on `/profile`, even from "Sign in to edit your listing" or "Sign in to message the landlord". Separately, if restoring the session ever failed, `loading` stayed true and every page behind `RequireAuth` would spin forever.
Decision: Sign-in links carry `?next=<path>` (`signInHref` in `client/src/lib/redirect.ts`) and the sign-in page goes there afterwards. `safeNextPath` only accepts paths on this site: `//evil.com`, `/\evil.com`, full URLs and `javascript:` fall back to `/profile`, so the parameter can't be used as an open redirect (2 tests). The session restore now always ends the loading state. Removed a leftover `searchHistory` cleanup from sign-out.
Tradeoff: None.

## 2026-10-14: Local end-to-end check against real Supabase
Context: The signed-in pages had only been type-checked, and the migrations had only run in PGlite. A full Supabase stack runs locally in Docker, so these could be tested for real before deploying.
Decision: Ran the Supabase CLI's local stack (Postgres 17, auth, storage, realtime) outside the repo, applied the 7 migrations unchanged, seeded (8 listings, all geocoded) and clicked through every signed-in flow in a browser: sign-in with `?next=`, Profile, My listings, create a listing with a photo (geocoded to 43.259, -79.916), reload on the edit page, edit with a photo swap, delete, favorites, live chat between two accounts (delivered without a reload, shown once, unread badge updates on other pages), natural-language search (results match a direct SQL query), the map, and avatar replacement. A fresh third account read 0 conversations, 0 messages and 0 presence rows; posting into someone else's conversation got 404 from the API and an RLS violation (403) from a direct insert. The Supabase CLI is not a project dependency; it ran through `npx` in a scratch folder.
Tradeoff: Local is not production. Email delivery, Vercel's serverless runtime and real network latency are still unchecked until the deploy.

## 2026-10-14: Delete photos nobody points at
Context: The local check found that no code ever deleted a file from storage. Removing a photo while editing, deleting a listing, replacing a profile picture, or a save failing after upload all left files behind.
Decision: `removeImages` in `client/src/lib/storage.ts` deletes the files behind our own public URLs (other URLs, like seed photos, are skipped by `storagePath`). It runs only after the save succeeds, so a failed save never loses a photo the listing still uses, and it never throws, so a failed cleanup never fails a save (5 tests). The existing storage policy already limits deletes to the user's own folder. Checked in the browser: after an edit and a delete, only referenced photos were left; after replacing an avatar, only the new one.
Tradeoff: Best effort from the browser. If the tab closes between the save and the cleanup, a file is left behind; a scheduled server-side sweep would catch those but isn't worth it at this size.

## 2026-10-14: Accessible favorite and inbox buttons
Context: The favorite button's only label was an emoji, so screen readers announced "white heart". The inbox link's label sat on a `div`, where ARIA doesn't allow it. Signed out, the heart showed "Failed to update favorites".
Decision: The heart is labelled "Save <title>" with `aria-pressed`, the emoji is hidden from screen readers, the inbox link carries "Messages, N unread" itself, and signed-out visitors get "Sign in to save listings" with a sign-in button that brings them back.
Tradeoff: None.

## 2026-10-14: Interface redesign
Context: Paramveer asked for a low-key, professional interface with no gradients and its own character. The old pages mixed a purple and blue gradient theme, glass effects, two icon sets (Font Awesome from a CDN and lucide), emoji, and about 800 hard-coded colours, so dark mode couldn't be added without touching everything.
Decision: One set of colour tokens in `client/src/index.css` (warm paper, near-black ink, a brick accent after the brick houses near campus), redefined under `.dark` for dark mode. The theme follows the device until the user picks one, and an inline script in `client/index.html` applies it before the first paint so prerendered pages don't flash. Headings use a serif already on the device (Iowan Old Style, Palatino, Georgia), so no font downloads. Listings without photos show their street name on one of five muted tones (`client/src/lib/cover.ts`, 5 tests) instead of a grey house icon. Font Awesome and Framer Motion are removed; lucide is the only icon set. Every page was rebuilt: browse with a sticky filter column and a filter sheet on phones, a single-page listing sheet with a mini map and a sticky contact card, a home page that opens on the search with three tappable examples and the three newest listings, guides as one page with a contents list and a tested budget calculator (`client/src/lib/budget.ts`, 4 tests), and skeletons instead of spinners on browse, profile, my listings and the inbox. "Post a listing" and "My listings" are now in the navbar; before, creating a listing took three clicks from the profile page.
Content fixes made on the way: thermostat advice in Fahrenheit, advice to ask landlords for student discounts, a claim about free energy audits, a non-working "Tips & Resources" tab, a fixed $300 savings goal, "listings organized by nearby amenities" and a planned "support assistant" are gone. Studios no longer show "0 beds".
Measured: JavaScript needed for first render (main and vendor chunks, Vite's gzip figures) went from 188.9 kB to 170.9 kB, and the pages no longer load the Font Awesome stylesheet and fonts from a CDN. A Lighthouse re-run was started but stopped when the machine ran low on memory after 3 of 30 runs, so no new Lighthouse numbers are recorded.
Tradeoff: The Lighthouse and LCP numbers in "Prerendered public pages" were measured on the old interface and haven't been re-run; the README marks them that way. Re-measure before quoting them. Device fonts look slightly different on Windows and Apple.
