CREATE OR REPLACE FUNCTION software.join_demo_workspace() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = software AS $$
DECLARE ws uuid := '00000000-0000-0000-0000-000000000001'; r software.member_role;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members WHERE user_id = auth.uid() LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  ws := '00000000-0000-0000-0000-000000000001';
  r := CASE WHEN EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = ws) THEN 'member' ELSE 'owner' END;
  INSERT INTO software.workspace_members (workspace_id, user_id, role) VALUES (ws, auth.uid(), r);
  RETURN ws;
END $$;
REVOKE EXECUTE ON FUNCTION software.join_demo_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION software.join_demo_workspace() TO authenticated;