ALTER TABLE public.task_requests
  ADD COLUMN IF NOT EXISTS postpone_requested_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS postpone_requested_date date,
  ADD COLUMN IF NOT EXISTS postpone_reason text;