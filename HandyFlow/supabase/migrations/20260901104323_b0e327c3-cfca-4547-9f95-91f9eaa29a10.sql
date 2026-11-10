ALTER TABLE public.task_requests
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_max numeric,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Demo tasks readable by signed-in users" ON public.task_requests;
CREATE POLICY "Demo tasks readable by signed-in users"
ON public.task_requests FOR SELECT TO authenticated
USING (is_demo = true);