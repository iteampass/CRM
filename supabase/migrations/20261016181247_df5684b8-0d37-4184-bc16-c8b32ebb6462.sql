GRANT SELECT ON realestate.listings TO anon;
GRANT SELECT ON realestate.sources TO anon;
GRANT SELECT ON realestate.area_stats TO anon;

CREATE POLICY "Anyone can read listings" ON realestate.listings FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can read sources" ON realestate.sources FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can read area stats" ON realestate.area_stats FOR SELECT TO anon USING (true);