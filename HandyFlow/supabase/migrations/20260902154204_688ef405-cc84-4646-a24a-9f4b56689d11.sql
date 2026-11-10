ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_task_id_handyman_id_key;

ALTER TABLE public.task_requests
  ADD COLUMN IF NOT EXISTS cancel_requested_by uuid,
  ADD COLUMN IF NOT EXISTS postponed_to date;

CREATE TABLE IF NOT EXISTS public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  actor_role text not null default 'system',
  type text not null,
  message text not null default '',
  price numeric,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON public.task_events(task_id);

GRANT SELECT, INSERT ON public.task_events TO authenticated;
GRANT ALL ON public.task_events TO service_role;

ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and eligible handymen read task log"
ON public.task_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.task_requests t
    WHERE t.id = task_events.task_id
      AND (
        t.client_id = auth.uid()
        OR t.handyman_id = auth.uid()
        OR (t.handyman_id IS NULL AND public.has_role(auth.uid(), 'handyman'::public.app_role))
      )
  )
);

CREATE POLICY "Participants write task log"
ON public.task_events FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.task_requests t
    WHERE t.id = task_events.task_id
      AND (
        t.client_id = auth.uid()
        OR t.handyman_id = auth.uid()
        OR (t.handyman_id IS NULL AND public.has_role(auth.uid(), 'handyman'::public.app_role))
      )
  )
);