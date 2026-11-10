CREATE POLICY "Handymen can claim unassigned tasks"
ON public.task_requests
FOR UPDATE
TO authenticated
USING (handyman_id IS NULL AND status = 'pending'::task_status AND public.has_role(auth.uid(), 'handyman'))
WITH CHECK (handyman_id = auth.uid());