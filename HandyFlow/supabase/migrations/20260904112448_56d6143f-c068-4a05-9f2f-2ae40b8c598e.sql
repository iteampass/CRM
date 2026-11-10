CREATE POLICY "Handymen create own offers" ON public.offers
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = handyman_id
  AND public.has_role(auth.uid(), 'handyman'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.task_requests t
    WHERE t.id = offers.task_id
      AND (t.handyman_id = auth.uid() OR t.handyman_id IS NULL)
  )
);