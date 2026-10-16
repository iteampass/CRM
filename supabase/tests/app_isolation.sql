-- Run as postgres on a Supabase database. All fixtures and changes roll back.
BEGIN;
SELECT set_config('test.user_a', gen_random_uuid()::text, true),
       set_config('test.user_b', gen_random_uuid()::text, true),
       set_config('test.unverified', gen_random_uuid()::text, true),
       set_config('test.search_a', gen_random_uuid()::text, true),
       set_config('test.listing', gen_random_uuid()::text, true),
       set_config('test.owner', (SELECT user_id::text FROM software.workspace_members WHERE role = 'owner' ORDER BY created_at LIMIT 1), true),
       set_config('test.workspace', (SELECT workspace_id::text FROM software.workspace_members WHERE role = 'owner' ORDER BY created_at LIMIT 1), true);
DO $$ BEGIN
  IF current_setting('test.owner', true) IS NULL OR current_setting('test.owner') = '' THEN RAISE EXCEPTION 'An existing owner is required for this test'; END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname IN ('enforce_allowed_signin_email','join_teampass_workspace')) THEN RAISE EXCEPTION 'Global app-specific auth triggers remain'; END IF;
END $$;
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES (current_setting('test.user_a')::uuid, current_setting('test.user_a') || '@example.invalid', now()),
       (current_setting('test.user_b')::uuid, current_setting('test.user_b') || '@example.invalid', now()),
       (current_setting('test.unverified')::uuid, current_setting('test.unverified') || '@example.invalid', NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM software.workspace_members WHERE user_id IN (current_setting('test.user_a')::uuid, current_setting('test.user_b')::uuid)) THEN RAISE EXCEPTION 'Signup granted CRM membership'; END IF;
END $$;
INSERT INTO realestate.listings (id,title,area,price_eur,size_m2,source,status)
VALUES (current_setting('test.listing')::uuid,'Isolation test','Test',100,30,'test','test');
SELECT set_config('request.jwt.claim.sub', current_setting('test.owner'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF software.join_demo_workspace() <> current_setting('test.workspace')::uuid OR NOT software.is_admin(current_setting('test.workspace')::uuid) THEN RAISE EXCEPTION 'Owner lost access'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM software.join_demo_workspace();
    RAISE EXCEPTION 'Uninvited user joined CRM';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM software.companies) OR EXISTS (SELECT 1 FROM software.workspace_members) THEN RAISE EXCEPTION 'Uninvited user can read CRM'; END IF;
END $$;
INSERT INTO realestate.favorites(user_id,listing_id) VALUES (auth.uid(),current_setting('test.listing')::uuid);
INSERT INTO realestate.saved_searches(id,user_id,name) VALUES (current_setting('test.search_a')::uuid,auth.uid(),'Private search');
INSERT INTO realestate.profiles(user_id,full_name) VALUES (auth.uid(),'Private profile');
RESET ROLE;
INSERT INTO realestate.alerts(user_id,listing_id,saved_search_id)
VALUES (current_setting('test.user_a')::uuid,current_setting('test.listing')::uuid,current_setting('test.search_a')::uuid);
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected int; BEGIN
  IF EXISTS (SELECT 1 FROM realestate.favorites) OR EXISTS (SELECT 1 FROM realestate.saved_searches) OR EXISTS (SELECT 1 FROM realestate.profiles) OR EXISTS (SELECT 1 FROM realestate.alerts) THEN RAISE EXCEPTION 'Another user can read personal data'; END IF;
  UPDATE realestate.saved_searches SET name='Stolen' WHERE id=current_setting('test.search_a')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Another user can edit saved searches'; END IF;
  DELETE FROM realestate.favorites WHERE user_id=current_setting('test.user_a')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Another user can delete favorites'; END IF;
  UPDATE realestate.profiles SET full_name='Stolen' WHERE user_id=current_setting('test.user_a')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Another user can edit profiles'; END IF;
  UPDATE realestate.alerts SET is_read=true WHERE user_id=current_setting('test.user_a')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Another user can edit alerts'; END IF;
  BEGIN
    INSERT INTO realestate.favorites(user_id,listing_id) VALUES (current_setting('test.user_a')::uuid,current_setting('test.listing')::uuid);
    RAISE EXCEPTION 'Another user can insert favorites';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM realestate.favorites) <> 1 OR (SELECT count(*) FROM realestate.saved_searches) <> 1 OR (SELECT count(*) FROM realestate.profiles) <> 1 OR (SELECT count(*) FROM realestate.alerts) <> 1 THEN RAISE EXCEPTION 'User cannot read own data'; END IF;
  UPDATE realestate.alerts SET is_read=true;
  BEGIN
    UPDATE realestate.profiles SET user_id=current_setting('test.user_b')::uuid;
    RAISE EXCEPTION 'Profile ownership can be reassigned';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
INSERT INTO software.workspace_invitations(workspace_id,email,role,created_at) VALUES
(current_setting('test.workspace')::uuid,current_setting('test.user_a') || '@example.invalid','member',now() - interval '8 days'),
(current_setting('test.workspace')::uuid,current_setting('test.unverified') || '@example.invalid','member',now());
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM software.join_demo_workspace(); RAISE EXCEPTION 'Expired invitation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', current_setting('test.unverified'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM software.join_demo_workspace(); RAISE EXCEPTION 'Unverified email invitation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
UPDATE software.workspace_invitations SET created_at=now() WHERE email=current_setting('test.user_a') || '@example.invalid';
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF software.join_demo_workspace() <> current_setting('test.workspace')::uuid THEN RAISE EXCEPTION 'Valid invitation failed'; END IF;
  IF software.is_admin(current_setting('test.workspace')::uuid) THEN RAISE EXCEPTION 'Member invitation granted admin'; END IF;
  IF (SELECT role FROM software.workspace_members WHERE user_id=auth.uid()) <> 'member' THEN RAISE EXCEPTION 'Wrong role assigned'; END IF;
  IF software.join_demo_workspace() <> current_setting('test.workspace')::uuid THEN RAISE EXCEPTION 'Repeat visit failed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM software.workspace_invitations WHERE email=current_setting('test.user_a') || '@example.invalid') THEN RAISE EXCEPTION 'Invitation was not consumed'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: owner access, uninvited denial, personal-data isolation, expired/unverified invitation denial, valid invitation and repeat visit; fixtures rolled back' AS result;
