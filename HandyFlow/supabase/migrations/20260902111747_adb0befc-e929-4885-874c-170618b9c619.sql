CREATE POLICY "Handymen can claim unassigned tasks"
ON public.task_requests
FOR UPDATE
TO authenticated
USING (handyman_id IS NULL AND public.has_role(auth.uid(), 'handyman'))
WITH CHECK (handyman_id = auth.uid() AND public.has_role(auth.uid(), 'handyman'));