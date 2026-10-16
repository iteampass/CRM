CREATE TABLE software.site_content (
  id text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON software.site_content TO anon, authenticated;
GRANT INSERT, UPDATE ON software.site_content TO authenticated;
GRANT ALL ON software.site_content TO service_role;
ALTER TABLE software.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site content" ON software.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "TeamPass admins insert site content" ON software.site_content FOR INSERT TO authenticated WITH CHECK (software.is_admin('00000000-0000-0000-0000-000000000001'));
CREATE POLICY "TeamPass admins update site content" ON software.site_content FOR UPDATE TO authenticated USING (software.is_admin('00000000-0000-0000-0000-000000000001')) WITH CHECK (software.is_admin('00000000-0000-0000-0000-000000000001'));
CREATE TRIGGER site_content_touch BEFORE UPDATE ON software.site_content FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();