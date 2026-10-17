-- Rollback-only integration test, run as postgres.
BEGIN;
SELECT set_config('test.import_a', gen_random_uuid()::text, true), set_config('test.import_b', gen_random_uuid()::text, true);
INSERT INTO auth.users(id,email,email_confirmed_at)
VALUES (current_setting('test.import_a')::uuid,current_setting('test.import_a')||'@example.invalid',now()),
       (current_setting('test.import_b')::uuid,current_setting('test.import_b')||'@example.invalid',now());
SELECT set_config('request.jwt.claim.sub',current_setting('test.import_a'),true);
SET LOCAL ROLE authenticated;
INSERT INTO realestate.imported_rentals(user_id,source_url,status,page_kind,location,price,currency,raw_data)
VALUES(auth.uid(),'https://rentals.example.org/test','extracted','listing','Valjevo',400,'EUR','{"source":"private raw content"}');
DO $$ BEGIN
  IF (SELECT count(*) FROM realestate.imported_rentals WHERE user_id=auth.uid()) <> 1 THEN RAISE EXCEPTION 'Cannot read own import'; END IF;
  BEGIN
    INSERT INTO realestate.imported_rentals(user_id,source_url,status,page_kind) VALUES(auth.uid(),'https://rentals.example.org/test','extracted','listing');
    RAISE EXCEPTION 'Duplicate source permitted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    UPDATE realestate.imported_rentals SET user_id=current_setting('test.import_b')::uuid WHERE user_id=auth.uid();
    RAISE EXCEPTION 'Can transfer record ownership';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('test.import_b'),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected int; BEGIN
  IF EXISTS (SELECT 1 FROM realestate.imported_rentals WHERE user_id=current_setting('test.import_a')::uuid) THEN RAISE EXCEPTION 'Raw data exposed across users'; END IF;
  UPDATE realestate.imported_rentals SET location='Stolen' WHERE user_id=current_setting('test.import_a')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Cross-user update permitted'; END IF;
  DELETE FROM realestate.imported_rentals WHERE user_id=current_setting('test.import_a')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Cross-user delete permitted'; END IF;
  BEGIN
    INSERT INTO realestate.imported_rentals(user_id,source_url,status,page_kind) VALUES(current_setting('test.import_a')::uuid,'https://rentals.example.org/forged','extracted','listing');
    RAISE EXCEPTION 'Cross-user insert permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- Different users may import the same source privately.
INSERT INTO realestate.imported_rentals(user_id,source_url,status,page_kind) VALUES(auth.uid(),'https://rentals.example.org/test','needs_review','directory');
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM realestate.imported_rentals;
    RAISE EXCEPTION 'Anonymous access permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'imported rentals ownership, raw-data privacy and deduplication passed' AS result;
