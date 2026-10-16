-- Shared Auth identifies a user; software membership authorizes CRM access.
-- Existing memberships (including the owner) are deliberately preserved.
DROP TRIGGER IF EXISTS enforce_allowed_signin_email ON auth.users;
DROP TRIGGER IF EXISTS join_teampass_workspace ON auth.users;
DROP FUNCTION IF EXISTS public.enforce_allowed_signin_email();
DROP FUNCTION IF EXISTS public.join_teampass_workspace();

CREATE OR REPLACE FUNCTION software.join_demo_workspace()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := auth.uid();
  ws uuid;
  em text;
  confirmed_at timestamptz;
  inv software.workspace_invitations%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  -- Serialize simultaneous first visits by the same user.
  SELECT email, email_confirmed_at INTO em, confirmed_at
    FROM auth.users WHERE id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members
    WHERE user_id = me ORDER BY created_at, workspace_id LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Verify your email before accepting a workspace invitation' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO inv FROM software.workspace_invitations
    WHERE lower(email) = lower(em) AND role <> 'owner'::software.member_role
      AND created_at > now() - interval '7 days'
    ORDER BY created_at, id LIMIT 1 FOR UPDATE;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'You don''t have access to this workspace. Ask an administrator for an invitation.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO software.workspace_members (workspace_id, user_id, role)
    VALUES (inv.workspace_id, me, inv.role);
  DELETE FROM software.workspace_invitations WHERE id = inv.id;
  RETURN inv.workspace_id;
END;
$$;
REVOKE ALL ON FUNCTION software.join_demo_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION software.join_demo_workspace() TO authenticated;

-- Invitation acceptance no longer needs a system flag that bypasses owner protection.
CREATE OR REPLACE FUNCTION software.protect_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.role::text = 'owner' THEN RAISE EXCEPTION 'The workspace owner cannot be changed or removed'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.role::text = 'owner' THEN RAISE EXCEPTION 'Owner role cannot be assigned'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.user_id <> OLD.user_id OR NEW.workspace_id <> OLD.workspace_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TABLE realestate.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '' CHECK (length(full_name) <= 120),
  preferred_city text NOT NULL DEFAULT 'Belgrade' CHECK (length(preferred_city) <= 120),
  max_budget numeric(10,2) CHECK (max_budget >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE realestate.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON realestate.profiles TO authenticated;
GRANT ALL ON realestate.profiles TO service_role;
CREATE POLICY "Users manage own profile" ON realestate.profiles FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON realestate.profiles
  FOR EACH ROW EXECUTE FUNCTION realestate.set_updated_at();

-- Alert creation belongs to the future matching job. Users may only mark their own alerts read.
REVOKE INSERT, UPDATE ON realestate.alerts FROM authenticated;
GRANT UPDATE (is_read) ON realestate.alerts TO authenticated;
DROP POLICY IF EXISTS "Users insert own alerts" ON realestate.alerts;
ALTER TABLE realestate.saved_searches ALTER COLUMN alerts_enabled SET DEFAULT false;
CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx ON realestate.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS alerts_user_id_created_at_idx ON realestate.alerts(user_id, created_at DESC);

-- These exact IDs were inserted as demo inventory by the original migration.
-- Keep them for explicit demo mode without advertising them as live rentals.
UPDATE realestate.listings SET status = 'demo'
WHERE id IN ('00000001-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000002',
             '00000001-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000004',
             '00000001-0000-0000-0000-000000000005', '00000001-0000-0000-0000-000000000006')
  AND source_url IS NULL AND status = 'active';
