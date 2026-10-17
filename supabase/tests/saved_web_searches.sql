BEGIN;
SELECT set_config('test.search_user', gen_random_uuid()::text, true);
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(current_setting('test.search_user')::uuid,current_setting('test.search_user')||'@example.invalid',now());
SELECT set_config('request.jwt.claim.sub',current_setting('test.search_user'),true);
SET LOCAL ROLE authenticated;
INSERT INTO realestate.saved_searches(user_id,name,city,keywords) VALUES(auth.uid(),'Web keyword round-trip','Valjevo',ARRAY['izdavanje stanova','pet friendly rent']);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM realestate.saved_searches WHERE user_id=auth.uid() AND name='Web keyword round-trip' AND city='Valjevo' AND keywords=ARRAY['izdavanje stanova','pet friendly rent']) THEN RAISE EXCEPTION 'Web criteria did not round-trip'; END IF;
END $$;
UPDATE realestate.saved_searches SET keywords=ARRAY['stan sa parkingom'] WHERE user_id=auth.uid();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM realestate.saved_searches WHERE user_id=auth.uid() AND keywords=ARRAY['stan sa parkingom']) THEN RAISE EXCEPTION 'Keyword edit failed'; END IF;
END $$;
INSERT INTO realestate.saved_searches(user_id,name) VALUES(auth.uid(),'Legacy criteria');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM realestate.saved_searches WHERE user_id=auth.uid() AND name='Legacy criteria' AND keywords='{}'::text[]) THEN RAISE EXCEPTION 'Legacy default failed'; END IF;
  BEGIN
    UPDATE realestate.saved_searches SET keywords=ARRAY['aa','bb','cc','dd','ee','ff'] WHERE user_id=auth.uid();
    RAISE EXCEPTION 'More than five phrases accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM realestate.saved_searches WHERE user_id=current_setting('test.search_user')::uuid) THEN RAISE EXCEPTION 'Saved keywords visible to another user'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'saved web searches round-trip, edit, legacy default and privacy passed' AS result;
