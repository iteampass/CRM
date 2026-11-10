BEGIN;
CREATE OR REPLACE FUNCTION public.get_request_client_contact(_task_id uuid)
RETURNS TABLE(name text, email text, phones text[], address text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT public.has_role(actor, 'handyman') THEN
    RAISE EXCEPTION 'Only signed-in handymen can view client contact details' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.name, p.email, p.phones, p.address
    FROM public.task_requests t
    JOIN public.profiles p ON p.id = t.client_id
    JOIN public.profiles me ON me.id = actor
    WHERE t.id = _task_id
      AND nullif(upper(trim(me.country_code)), '') = nullif(upper(trim(p.country_code)), '')
      AND (t.handyman_id = actor OR
        (t.handyman_id IS NULL AND t.status IN ('pending', 'negotiating')));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client contact details are not available for this request' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_request_client_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_request_client_contact(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
