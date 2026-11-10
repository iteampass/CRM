BEGIN;
CREATE OR REPLACE FUNCTION public.get_request_participant_contact(_task_id uuid)
RETURNS TABLE(name text, email text, phones text[], address text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to view contact details' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.name, p.email, p.phones, p.address
    FROM public.task_requests t
    JOIN public.profiles p ON p.id = CASE
      WHEN t.client_id = actor THEN t.handyman_id
      ELSE t.client_id END
    WHERE t.id = _task_id AND t.handyman_id IS NOT NULL
      AND (t.client_id = actor OR t.handyman_id = actor);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact details are available only to the client and assigned handyman of a taken request' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_request_participant_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_request_participant_contact(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
