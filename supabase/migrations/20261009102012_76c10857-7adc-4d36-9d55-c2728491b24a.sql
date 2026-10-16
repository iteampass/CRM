ALTER TYPE software.member_role ADD VALUE IF NOT EXISTS 'manager';

CREATE TABLE software.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role software.member_role NOT NULL DEFAULT 'member',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX workspace_invitations_ws_email ON software.workspace_invitations (workspace_id, lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON software.workspace_invitations TO authenticated;
GRANT ALL ON software.workspace_invitations TO service_role;
ALTER TABLE software.workspace_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_select ON software.workspace_invitations FOR SELECT TO authenticated USING (software.is_member(workspace_id));
CREATE POLICY inv_admin ON software.workspace_invitations FOR ALL TO authenticated USING (software.is_admin(workspace_id)) WITH CHECK (software.is_admin(workspace_id) AND role::text <> 'owner');

CREATE OR REPLACE FUNCTION software.list_members(_ws uuid)
RETURNS TABLE (user_id uuid, email text, full_name text, avatar_path text, role software.member_role, joined_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = software, public
AS $$
BEGIN
  IF NOT software.is_member(_ws) THEN RAISE EXCEPTION 'not a member'; END IF;
  RETURN QUERY
    SELECT m.user_id, u.email::text, (u.raw_user_meta_data->>'full_name')::text, (u.raw_user_meta_data->>'avatar_path')::text, m.role, m.created_at
    FROM software.workspace_members m JOIN auth.users u ON u.id = m.user_id
    WHERE m.workspace_id = _ws ORDER BY m.created_at;
END $$;
REVOKE EXECUTE ON FUNCTION software.list_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION software.list_members(uuid) TO authenticated;

-- Owner row is protected; nobody can be promoted to owner via the app.
CREATE OR REPLACE FUNCTION software.protect_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = software AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.role::text = 'owner' THEN RAISE EXCEPTION 'The workspace owner cannot be changed or removed'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.role::text = 'owner' THEN RAISE EXCEPTION 'Owner role cannot be assigned'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.user_id <> OLD.user_id OR NEW.workspace_id <> OLD.workspace_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER workspace_members_protect_owner BEFORE INSERT OR UPDATE OR DELETE ON software.workspace_members FOR EACH ROW EXECUTE FUNCTION software.protect_owner();

CREATE OR REPLACE FUNCTION software.join_demo_workspace()
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'software'
AS $function$
DECLARE ws uuid; r software.member_role; inv record; em text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members WHERE user_id = auth.uid() LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  SELECT * INTO inv FROM software.workspace_invitations WHERE lower(email) = lower(em) ORDER BY created_at LIMIT 1;
  IF inv.id IS NOT NULL THEN
    ws := inv.workspace_id; r := inv.role;
    DELETE FROM software.workspace_invitations WHERE id = inv.id;
  ELSE
    ws := '00000000-0000-0000-0000-000000000001';
    r := CASE WHEN EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = ws) THEN 'member' ELSE 'owner' END;
  END IF;
  -- bypass owner-protection trigger for the system-assigned first owner
  PERFORM set_config('request.jwt.claim.sub', '', true);
  INSERT INTO software.workspace_members (workspace_id, user_id, role) VALUES (ws, auth.uid(), r);
  RETURN ws;
END $function$;