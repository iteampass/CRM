-- The existing admin RLS policy already restricts these writes to app admins.
-- RLS policies alone do not grant the SQL privileges needed for upsert.
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
