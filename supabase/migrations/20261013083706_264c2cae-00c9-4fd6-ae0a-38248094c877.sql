CREATE OR REPLACE FUNCTION public.enforce_allowed_signin_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.email,'')) NOT IN ('ivan@teampass.me','ivan.teampass@gmail.com') THEN
    RAISE EXCEPTION 'This email is not allowed to sign in';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_allowed_signin_email() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_allowed_signin_email BEFORE INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_allowed_signin_email();

CREATE OR REPLACE FUNCTION public.join_teampass_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO software.workspace_members (workspace_id, user_id, role)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.join_teampass_workspace() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER join_teampass_workspace AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.join_teampass_workspace();

UPDATE software.workspaces SET name = 'TeamPass' WHERE id = '00000000-0000-0000-0000-000000000001';