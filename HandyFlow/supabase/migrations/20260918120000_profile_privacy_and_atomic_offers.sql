BEGIN;

-- Full records (contact details and precise addresses) are owner-only.
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Signed-in users can read profiles" ON public.profiles;
CREATE POLICY "Users read own full profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

-- Intentionally owner-executed: the view exposes ONLY directory fields while
-- the underlying table remains owner-only. Never add contact/address columns.
CREATE VIEW public.profile_directory WITH (security_barrier = true) AS
SELECT p.id, p.name, p.avatar, p.headline, p.rating, p.reviews_count,
       p.jobs_done, p.daily_rate, p.available, p.country_code, p.bio,
       p.location, p.specialties, p.city, p.country, p.is_public
FROM public.profiles p
WHERE auth.uid() IS NOT NULL AND (
  p.is_public OR p.id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.task_requests t
    WHERE (p.id = t.client_id OR p.id = t.handyman_id)
      AND (auth.uid() = t.client_id OR auth.uid() = t.handyman_id
        OR (t.handyman_id IS NULL AND public.has_role(auth.uid(), 'handyman')))
  )
);
REVOKE ALL ON public.profile_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profile_directory TO authenticated;

-- All writes, including the event, are one transaction. Identity is taken
-- from the JWT, never a caller-supplied user ID. Lock the task before the offer
-- so operations on separate offers for the same task serialize.
CREATE FUNCTION public.resolve_offer(_offer_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor uuid := auth.uid();
  _task_id uuid;
  _task public.task_requests%ROWTYPE;
  _offer public.offers%ROWTYPE;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _action IS NULL OR _action NOT IN ('accept', 'decline', 'another', 'withdraw') THEN
    RAISE EXCEPTION 'Invalid offer action';
  END IF;
  SELECT task_id INTO _task_id FROM public.offers WHERE id = _offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  SELECT * INTO _task FROM public.task_requests WHERE id = _task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  SELECT * INTO _offer FROM public.offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND OR _offer.task_id IS DISTINCT FROM _task_id THEN
    RAISE EXCEPTION 'Offer changed; refresh and try again';
  END IF;
  IF _action = 'withdraw' THEN
    IF _offer.handyman_id <> _actor THEN RAISE EXCEPTION 'Only the offering handyman can withdraw'; END IF;
  ELSIF _task.client_id <> _actor THEN
    RAISE EXCEPTION 'Only the client can accept or reject an offer';
  END IF;
  IF _offer.status <> 'pending' THEN RAISE EXCEPTION 'This offer is no longer pending'; END IF;
  IF _task.status NOT IN ('pending', 'negotiating') THEN
    RAISE EXCEPTION 'This request is no longer accepting offer changes';
  END IF;
  IF _task.handyman_id IS DISTINCT FROM _offer.handyman_id THEN
    RAISE EXCEPTION 'This offer is no longer assigned to the request';
  END IF;

  IF _action = 'accept' THEN
    UPDATE public.task_requests SET status = 'agreed', agreed_price = _offer.price
    WHERE id = _task_id;
    UPDATE public.offers SET status = CASE WHEN id = _offer_id
      THEN 'accepted'::public.offer_status ELSE 'declined'::public.offer_status END
    WHERE task_id = _task_id AND status = 'pending';
    INSERT INTO public.task_events (task_id, actor_id, actor_role, type, message, price)
    VALUES (_task_id, _actor, 'client', 'offer_accepted',
      'Client accepted the offer — price agreed', _offer.price);
    RETURN;
  END IF;

  UPDATE public.offers SET status = CASE WHEN _action = 'withdraw'
    THEN 'withdrawn'::public.offer_status ELSE 'declined'::public.offer_status END
  WHERE id = _offer_id;
  UPDATE public.task_requests SET status = 'pending', agreed_price = NULL,
    handyman_id = CASE WHEN _action = 'another' THEN handyman_id ELSE NULL END
  WHERE id = _task_id;
  INSERT INTO public.task_events (task_id, actor_id, actor_role, type, message)
  VALUES (_task_id, _actor,
    CASE WHEN _action = 'withdraw' THEN 'handyman' ELSE 'client' END,
    CASE _action WHEN 'withdraw' THEN 'offer_withdrawn'
      WHEN 'another' THEN 'another_offer_requested' ELSE 'offer_declined' END,
    CASE _action WHEN 'withdraw' THEN 'Handyman withdrew the offer — request is open again'
      WHEN 'another' THEN 'Client asked for another offer'
      ELSE 'Client declined the offer — request is open again' END);
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_offer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_offer(uuid, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
