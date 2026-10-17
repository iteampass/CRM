CREATE TABLE realestate.imported_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url text NOT NULL CHECK (length(source_url) <= 2000 AND source_url ~ '^https?://'),
  status text NOT NULL CHECK (status IN ('extracted', 'needs_review', 'failed')),
  page_kind text NOT NULL CHECK (page_kind IN ('listing', 'directory', 'unavailable', 'other')),
  title text,
  location text,
  street text,
  address text,
  floor text,
  price numeric CHECK (price >= 0),
  currency text,
  price_period text,
  price_raw text,
  building_type text,
  parking text,
  advertiser_type text NOT NULL DEFAULT 'unknown' CHECK (advertiser_type IN ('agency', 'owner', 'unknown')),
  advertiser_name text,
  date_announced text,
  description text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
  listing_links jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(listing_links) = 'array'),
  notes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(notes) = 'array'),
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(raw_data) = 'object'),
  error_message text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT imported_rentals_user_source_key UNIQUE (user_id, source_url)
);
CREATE INDEX imported_rentals_user_imported_idx ON realestate.imported_rentals (user_id, imported_at DESC, id);
ALTER TABLE realestate.imported_rentals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON realestate.imported_rentals FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON realestate.imported_rentals TO authenticated;
GRANT ALL ON realestate.imported_rentals TO service_role;
CREATE POLICY "Users read own imported rentals" ON realestate.imported_rentals FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own imported rentals" ON realestate.imported_rentals FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own imported rentals" ON realestate.imported_rentals FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own imported rentals" ON realestate.imported_rentals FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
COMMENT ON TABLE realestate.imported_rentals IS 'Private unverified AI extractions. Photo URLs point to original hosts; raw_data contains retrieved reader content and model output.';
NOTIFY pgrst, 'reload schema';
