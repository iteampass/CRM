REVOKE EXECUTE ON FUNCTION software.is_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION software.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION software.join_demo_workspace() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION software.is_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION software.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION software.join_demo_workspace() TO authenticated, service_role;