CREATE TABLE public.handyman_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, DELETE ON public.handyman_invites TO authenticated;
GRANT ALL ON public.handyman_invites TO service_role;
ALTER TABLE public.handyman_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own invites" ON public.handyman_invites FOR ALL TO authenticated USING (inviter_id = auth.uid()) WITH CHECK (inviter_id = auth.uid());
CREATE INDEX handyman_invites_inviter_idx ON public.handyman_invites(inviter_id);