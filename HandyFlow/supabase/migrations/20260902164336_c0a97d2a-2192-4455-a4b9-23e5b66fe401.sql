ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'client_to_handyman';

UPDATE public.reviews SET reviewer_id = client_id WHERE reviewer_id IS NULL;
ALTER TABLE public.reviews ALTER COLUMN reviewer_id SET NOT NULL;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_task_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_task_reviewer_key ON public.reviews (task_id, reviewer_id);

DROP POLICY IF EXISTS "Clients review own completed tasks" ON public.reviews;
CREATE POLICY "Participants review completed tasks"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.task_requests t
    WHERE t.id = reviews.task_id
      AND t.status = 'completed'::task_status
      AND t.client_id = reviews.client_id
      AND t.handyman_id = reviews.handyman_id
      AND (
        (reviews.direction = 'client_to_handyman' AND t.client_id = auth.uid())
        OR (reviews.direction = 'handyman_to_client' AND t.handyman_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Clients update own reviews" ON public.reviews;
CREATE POLICY "Reviewers update own reviews"
ON public.reviews FOR UPDATE TO authenticated
USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

CREATE OR REPLACE FUNCTION public.refresh_handyman_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _h uuid;
BEGIN
  _h := COALESCE(NEW.handyman_id, OLD.handyman_id);
  UPDATE public.profiles p SET
    rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.handyman_id = _h AND r.direction = 'client_to_handyman'), 0),
    reviews_count = (SELECT count(*) FROM public.reviews r WHERE r.handyman_id = _h AND r.direction = 'client_to_handyman')
  WHERE p.id = _h;
  RETURN NULL;
END; $function$;