# Build realestate schema tables and wire the app to them

## Current state (verified)

- External Supabase project `CRM` (ref `rtaszifelvzbvcbqgrig`) is connected and reachable.
- Schema `realestate` exists but is **empty**: no tables, views or functions.
- `anon` and `authenticated` have **no USAGE grant** on `realestate`, and the Data API does not serve the schema (it only serves `public` by default).
- The UI currently renders sample data from `src/lib/listings.ts` (Listing type: title, area, price, beds, baths, size, image, source, foundAgo, score, risk, duplicates, furnished, map x/y).
- Pages that consume data: Discover, Map, Favorites, Alerts, Saved searches, Price insights, Admin (sources & jobs).

## Step 1 — Migration: create tables in `realestate`

Tables match what the pages show (all inside `realestate`):

- `realestate.listings` — apartments: title, city, area, price_eur, beds, baths, size_m2, furnished, image_url, source, source_url, found_at, score, risk (low/medium/high), duplicate_count, map_x, map_y, status.
- `realestate.favorites` — user_id + listing_id, unique per user.
- `realestate.saved_searches` — user_id, name, city, areas[], min/max price, property type, move_in_date, alerts_enabled.
- `realestate.alerts` — user_id, listing_id, optional saved_search_id, is_read.
- `realestate.sources` — name, status, last_job_at, quota_used, quota_limit (Admin page).
- `realestate.area_stats` — area, period, avg_price, trend, sample_size (Price insights page).

Every table gets, in the same migration:

- `GRANT USAGE ON SCHEMA realestate` to anon, authenticated, service_role; table GRANTs per role.
- RLS enabled; listings, sources, area_stats readable by signed-in users; favorites/saved_searches/alerts scoped to `auth.uid()`.
- The 6 sample listings seeded as literal INSERT rows so Discover/Map render real data on first load.

Note: `GRANT USAGE ON SCHEMA realestate` (not `public`) is required here — the standard public-schema grant rule applies to grants-per-table the same way.

## Step 2 — Expose the schema to the app

After the migration, verify the app can read `realestate` through the Data API. If PostgREST returns "schema not found", the one remaining toggle is in the user's Supabase dashboard (Settings → API → add `realestate` to Exposed schemas) — I'll provide the direct link; it cannot be done via SQL.

## Step 3 — Wire the pages to real data

- Server functions (`createServerFn` with `requireSupabaseAuth`) read/write `realestate` tables; browser code keeps using the generated client where RLS covers it.
- Discover + Map: load listings from `realestate.listings` (sample file `src/lib/listings.ts` becomes a fallback only if the table is empty).
- Favorites: real rows per signed-in user, with the "3 of 10 free favorites" counter driven by data.
- Saved searches, Alerts: create/list real rows.
- Insights and Admin: read from `area_stats` / `sources`.
- Record in root `AGENTS.md`: all application data lives in schema `realestate` on the external CRM Supabase project — never `public`.

## Outcome

Discover, Favorites, Alerts, Saved searches, Insights and Admin read and write the `realestate` schema; one possible dashboard toggle by you if the API can't see the schema.
