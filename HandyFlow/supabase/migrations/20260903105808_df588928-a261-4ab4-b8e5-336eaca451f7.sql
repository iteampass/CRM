GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.repair_categories TO anon, authenticated;
GRANT ALL ON public.repair_categories TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_requests TO authenticated;
GRANT ALL ON public.task_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.handyman_invites TO authenticated;
GRANT ALL ON public.handyman_invites TO service_role;

GRANT ALL ON public.task_events TO service_role;