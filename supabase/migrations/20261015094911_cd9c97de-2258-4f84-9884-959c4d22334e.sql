GRANT USAGE ON SCHEMA software TO anon;
GRANT SELECT ON software.site_content TO anon;
NOTIFY pgrst, 'reload schema';