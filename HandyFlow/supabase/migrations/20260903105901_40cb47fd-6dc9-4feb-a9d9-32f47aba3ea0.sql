CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

GRANT SELECT, INSERT ON public.task_events TO authenticated;

CREATE POLICY "Task participants read events" ON public.task_events
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.task_requests t WHERE t.id = task_events.task_id AND (t.client_id = auth.uid() OR t.handyman_id = auth.uid())));

CREATE POLICY "Task participants add events" ON public.task_events
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.task_requests t WHERE t.id = task_events.task_id AND (t.client_id = auth.uid() OR t.handyman_id = auth.uid())));