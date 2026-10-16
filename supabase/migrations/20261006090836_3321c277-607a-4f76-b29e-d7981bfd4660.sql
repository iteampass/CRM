create table software.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references software.workspaces(id) on delete cascade,
  company_id uuid not null references software.companies(id) on delete cascade,
  title text not null default 'Software development opportunity',
  stage software.pipeline_stage not null default 'New',
  lead_score int not null default 0,
  owner_name text,
  source text,
  archived boolean not null default false,
  last_activity_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on software.leads(workspace_id);
create index on software.leads(company_id);
grant select, insert, update, delete on software.leads to authenticated;
grant all on software.leads to service_role;
alter table software.leads enable row level security;
create policy member_all on software.leads for all to authenticated using (software.is_member(workspace_id)) with check (software.is_member(workspace_id));
create trigger leads_touch before update on software.leads for each row execute function software.touch_updated_at();

create table software.lead_contacts (
  lead_id uuid not null references software.leads(id) on delete cascade,
  contact_id uuid not null references software.contacts(id) on delete cascade,
  workspace_id uuid not null references software.workspaces(id) on delete cascade,
  role text not null default 'Influencer',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (lead_id, contact_id)
);
create index on software.lead_contacts(contact_id);
grant select, insert, update, delete on software.lead_contacts to authenticated;
grant all on software.lead_contacts to service_role;
alter table software.lead_contacts enable row level security;
create policy member_all on software.lead_contacts for all to authenticated using (software.is_member(workspace_id)) with check (software.is_member(workspace_id));

alter table software.deals add column lead_id uuid references software.leads(id) on delete cascade;

insert into software.leads (workspace_id, company_id, stage, lead_score, owner_name, source, archived, last_activity_at, created_at)
select workspace_id, id, stage, lead_score, owner_name, source, archived, last_activity_at, created_at from software.companies;

insert into software.lead_contacts (lead_id, contact_id, workspace_id, role, is_primary)
select l.id, c.id, c.workspace_id, case when c.is_decision_maker then 'Decision maker' else 'Influencer' end,
  c.id = (select c2.id from software.contacts c2 where c2.company_id = c.company_id order by c2.is_decision_maker desc, c2.created_at limit 1)
from software.contacts c join software.leads l on l.company_id = c.company_id;