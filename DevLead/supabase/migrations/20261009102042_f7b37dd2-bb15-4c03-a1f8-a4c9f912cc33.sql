CREATE OR REPLACE FUNCTION software.protect_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = software AS $$
BEGIN
  IF auth.uid() IS NULL OR current_setting('software.system_join', true) = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.role::text = 'owner' THEN RAISE EXCEPTION 'The workspace owner cannot be changed or removed'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.role::text = 'owner' THEN RAISE EXCEPTION 'Owner role cannot be assigned'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.user_id <> OLD.user_id OR NEW.workspace_id <> OLD.workspace_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION software.join_demo_workspace()
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'software'
AS $function$
DECLARE ws uuid; r software.member_role; inv record; em text; me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members WHERE user_id = me LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  SELECT email INTO em FROM auth.users WHERE id = me;
  SELECT * INTO inv FROM software.workspace_invitations WHERE lower(email) = lower(em) ORDER BY created_at LIMIT 1;
  IF inv.id IS NOT NULL THEN
    ws := inv.workspace_id; r := inv.role;
    DELETE FROM software.workspace_invitations WHERE id = inv.id;
  ELSE
    ws := '00000000-0000-0000-0000-000000000001';
    r := CASE WHEN EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = ws) THEN 'member' ELSE 'owner' END;
  END IF;
  PERFORM set_config('software.system_join', 'on', true);
  INSERT INTO software.workspace_members (workspace_id, user_id, role) VALUES (ws, me, r);
  PERFORM set_config('software.system_join', 'off', true);
  RETURN ws;
END $function$;