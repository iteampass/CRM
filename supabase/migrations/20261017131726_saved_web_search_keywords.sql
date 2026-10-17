ALTER TABLE realestate.saved_searches ADD COLUMN keywords text[] NOT NULL DEFAULT '{}'::text[] CHECK (cardinality(keywords) <= 5);
COMMENT ON COLUMN realestate.saved_searches.keywords IS 'Web-search keyword phrases, one query per phrase, combined with city. Empty for legacy criteria-only searches.';
NOTIFY pgrst, 'reload schema';
