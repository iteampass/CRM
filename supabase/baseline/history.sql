-- Run ONLY after schema.sql on an empty Supabase target.
-- Records the migrations represented by that baseline; does not re-run historical SQL.
BEGIN;
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261004145342','54ce1bd8-65f7-475c-bb2c-8e91e4965b71',ARRAY['
CREATE SCHEMA IF NOT EXISTS software;
GRANT USAGE ON SCHEMA software TO authenticated, service_role;

CREATE TYPE software.member_role AS ENUM (''owner'',''admin'',''member'');
CREATE TYPE software.pipeline_stage AS ENUM (''New'',''Researching'',''Qualified'',''Contacted'',''Meeting'',''Proposal'',''Negotiation'',''Won'',''Lost'');

CREATE OR REPLACE FUNCTION software.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = software AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE software.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT ''starter'',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role software.member_role NOT NULL DEFAULT ''member'',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE OR REPLACE FUNCTION software.is_member(_ws uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = software AS $$
  SELECT EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = _ws AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION software.is_admin(_ws uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = software AS $$
  SELECT EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = _ws AND user_id = auth.uid() AND role IN (''owner'',''admin''))
$$;

CREATE TABLE software.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, domain text, industry text, employees int, location text, funding text,
  technologies text[] NOT NULL DEFAULT ''{}'', lead_type text, source text,
  stage software.pipeline_stage NOT NULL DEFAULT ''New'', owner_name text,
  lead_score int NOT NULL DEFAULT 0, archived boolean NOT NULL DEFAULT false,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES software.companies(id) ON DELETE CASCADE,
  first_name text NOT NULL, last_name text, title text, email text, phone text, linkedin_url text,
  is_decision_maker boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES software.companies(id) ON DELETE CASCADE,
  type text NOT NULL, description text NOT NULL, strength int NOT NULL DEFAULT 50, source_url text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES software.companies(id) ON DELETE CASCADE,
  title text NOT NULL, stage software.pipeline_stage NOT NULL DEFAULT ''New'',
  value numeric(12,2) NOT NULL DEFAULT 0, probability int NOT NULL DEFAULT 10, expected_close date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES software.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES software.contacts(id) ON DELETE SET NULL,
  type text NOT NULL, summary text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES software.companies(id) ON DELETE CASCADE,
  title text NOT NULL, due_date date, priority text NOT NULL DEFAULT ''Medium'', done boolean NOT NULL DEFAULT false,
  assignee_name text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES software.companies(id) ON DELETE CASCADE,
  body text NOT NULL, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, color text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
CREATE TABLE software.company_tags (
  company_id uuid NOT NULL REFERENCES software.companies(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES software.tags(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, tag_id)
);
CREATE TABLE software.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, kind text NOT NULL, enabled boolean NOT NULL DEFAULT false, last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, filters jsonb NOT NULL DEFAULT ''{}'', alert boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.outreach_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, steps jsonb NOT NULL DEFAULT ''[]'', active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON software.companies(workspace_id, lead_score DESC);
CREATE INDEX ON software.contacts(company_id);
CREATE INDEX ON software.signals(company_id);
CREATE INDEX ON software.deals(workspace_id, stage);
CREATE INDEX ON software.activities(company_id, occurred_at DESC);
CREATE INDEX ON software.tasks(workspace_id, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA software TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA software TO service_role;
GRANT EXECUTE ON FUNCTION software.is_member(uuid), software.is_admin(uuid) TO authenticated;

ALTER TABLE software.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE software.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_select ON software.workspaces FOR SELECT TO authenticated USING (software.is_member(id));
CREATE POLICY ws_update ON software.workspaces FOR UPDATE TO authenticated USING (software.is_admin(id));
CREATE POLICY wm_select ON software.workspace_members FOR SELECT TO authenticated USING (software.is_member(workspace_id));
CREATE POLICY wm_admin ON software.workspace_members FOR ALL TO authenticated USING (software.is_admin(workspace_id)) WITH CHECK (software.is_admin(workspace_id));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[''companies'',''contacts'',''signals'',''deals'',''activities'',''tasks'',''notes'',''tags'',''company_tags'',''lead_sources'',''saved_searches'',''outreach_sequences''] LOOP
    EXECUTE format(''ALTER TABLE software.%I ENABLE ROW LEVEL SECURITY'', t);
    EXECUTE format(''CREATE POLICY member_all ON software.%I FOR ALL TO authenticated USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id))'', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[''workspaces'',''companies'',''contacts'',''signals'',''deals'',''activities'',''tasks'',''notes'',''tags'',''lead_sources'',''saved_searches'',''outreach_sequences''] LOOP
    EXECUTE format(''CREATE TRIGGER touch BEFORE UPDATE ON software.%I FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at()'', t);
  END LOOP;
END $$;

-- Demo data
INSERT INTO software.workspaces (id, name, plan) VALUES (''00000000-0000-0000-0000-000000000001'',''Stojsic Dev Studio'',''growth'');

INSERT INTO software.companies (id, workspace_id, name, domain, industry, employees, location, funding, technologies, lead_type, source, stage, owner_name, lead_score, last_activity_at) VALUES
(''10000000-0000-0000-0000-000000000001'',''00000000-0000-0000-0000-000000000001'',''Northwind Health'',''northwindhealth.io'',''Healthcare'',120,''Berlin, DE'',''Series A €8M'',''{React,Node.js,AWS}'',''Custom software'',''Funding news'',''Qualified'',''Ivan'',92, now()-interval ''1 day''),
(''10000000-0000-0000-0000-000000000002'',''00000000-0000-0000-0000-000000000001'',''Brightcart'',''brightcart.com'',''E-commerce'',45,''Amsterdam, NL'',''Seed €2M'',''{Shopify,PHP}'',''Store rebuild'',''Website audit'',''Contacted'',''Ivan'',84, now()-interval ''2 days''),
(''10000000-0000-0000-0000-000000000003'',''00000000-0000-0000-0000-000000000001'',''Fleetly Logistics'',''fleetly.eu'',''Logistics'',300,''Vienna, AT'',NULL,''{.NET,Angular,Azure}'',''Legacy modernization'',''Job board'',''Meeting'',''Ana'',78, now()-interval ''3 days''),
(''10000000-0000-0000-0000-000000000004'',''00000000-0000-0000-0000-000000000001'',''Ledgerly'',''ledgerly.app'',''Fintech'',30,''London, UK'',''Pre-seed £750k'',''{Python,Django}'',''MVP build'',''Product Hunt'',''New'',''Ana'',71, now()-interval ''5 days''),
(''10000000-0000-0000-0000-000000000005'',''00000000-0000-0000-0000-000000000001'',''Studio Kraft'',''studiokraft.de'',''Agency'',15,''Munich, DE'',NULL,''{WordPress,jQuery}'',''White-label dev'',''Referral'',''Proposal'',''Ivan'',66, now()-interval ''1 day''),
(''10000000-0000-0000-0000-000000000006'',''00000000-0000-0000-0000-000000000001'',''EduSpark'',''eduspark.org'',''Education'',80,''Belgrade, RS'',''Grant €500k'',''{Vue,Laravel}'',''Mobile app'',''LinkedIn'',''Researching'',''Marko'',58, now()-interval ''8 days''),
(''10000000-0000-0000-0000-000000000007'',''00000000-0000-0000-0000-000000000001'',''GreenGrid Energy'',''greengrid.energy'',''Energy'',210,''Zagreb, HR'',''Series B €20M'',''{React,Go,GCP}'',''Data platform'',''Funding news'',''Negotiation'',''Marko'',88, now()-interval ''1 day''),
(''10000000-0000-0000-0000-000000000008'',''00000000-0000-0000-0000-000000000001'',''Bistro Chain Co'',''bistrochain.com'',''Hospitality'',500,''Milan, IT'',NULL,''{Wix}'',''Booking system'',''Website audit'',''New'',''Ana'',41, now()-interval ''14 days'');

INSERT INTO software.contacts (workspace_id, company_id, first_name, last_name, title, email, is_decision_maker) VALUES
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000001'',''Lena'',''Hoffmann'',''CTO'',''lena@northwindhealth.io'',true),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000002'',''Daan'',''de Vries'',''Founder'',''daan@brightcart.com'',true),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000003'',''Thomas'',''Gruber'',''Head of IT'',''t.gruber@fleetly.eu'',true),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000004'',''Priya'',''Shah'',''CEO'',''priya@ledgerly.app'',true),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000005'',''Jonas'',''Kraft'',''Managing Director'',''jonas@studiokraft.de'',true),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000006'',''Milica'',''Jovanović'',''Product Lead'',''milica@eduspark.org'',false),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000007'',''Ivo'',''Horvat'',''VP Engineering'',''ivo@greengrid.energy'',true),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000008'',''Giulia'',''Rossi'',''Operations Manager'',''giulia@bistrochain.com'',false);

INSERT INTO software.signals (workspace_id, company_id, type, description, strength, detected_at) VALUES
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000001'',''Funding'',''Raised €8M Series A to expand platform'',90, now()-interval ''6 days''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000001'',''Hiring'',''Hiring 3 senior React developers'',80, now()-interval ''2 days''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000002'',''Outdated website'',''Store loads in 7.8s on mobile'',75, now()-interval ''4 days''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000003'',''Legacy tech'',''Still running .NET Framework 4.5 portal'',70, now()-interval ''10 days''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000004'',''Product launch'',''Launched beta on Product Hunt'',65, now()-interval ''3 days''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000005'',''Outsourcing'',''Posted freelance dev request'',70, now()-interval ''1 day''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000006'',''RFP'',''Published tender for mobile learning app'',60, now()-interval ''9 days''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000007'',''Funding'',''Closed €20M Series B'',95, now()-interval ''5 days''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000008'',''No online booking'',''No reservation system on website'',40, now()-interval ''20 days'');

INSERT INTO software.deals (workspace_id, company_id, title, stage, value, probability, expected_close) VALUES
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000001'',''Patient portal rebuild'',''Qualified'',45000,30, current_date+45),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000002'',''Shopify performance revamp'',''Contacted'',12000,20, current_date+30),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000003'',''Fleet portal modernization'',''Meeting'',80000,40, current_date+60),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000005'',''White-label dev retainer'',''Proposal'',24000,60, current_date+20),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000007'',''Energy data platform'',''Negotiation'',120000,75, current_date+14);

INSERT INTO software.activities (workspace_id, company_id, type, summary, occurred_at) VALUES
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000001'',''email'',''Sent intro email to Lena'', now()-interval ''1 day''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000003'',''meeting'',''Discovery call with Thomas'', now()-interval ''3 days''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000007'',''call'',''Pricing negotiation call'', now()-interval ''1 day''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000005'',''proposal'',''Sent proposal v2'', now()-interval ''1 day'');

INSERT INTO software.tasks (workspace_id, company_id, title, due_date, priority, assignee_name) VALUES
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000001'',''Follow up with Lena on scope'', current_date+1,''High'',''Ivan''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000002'',''Send performance audit PDF'', current_date,''Medium'',''Ivan''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000003'',''Prepare architecture proposal'', current_date+3,''High'',''Ana''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000007'',''Send final contract'', current_date+2,''High'',''Marko''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000006'',''Research tender requirements'', current_date+5,''Low'',''Marko'');

INSERT INTO software.notes (workspace_id, company_id, body) VALUES
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000001'',''Budget approved for Q1; wants HIPAA-like compliance.''),
(''00000000-0000-0000-0000-000000000001'',''10000000-0000-0000-0000-000000000007'',''Decision expected after board meeting.'');

INSERT INTO software.tags (workspace_id, name, color) VALUES
(''00000000-0000-0000-0000-000000000001'',''Hot'',''orange''),(''00000000-0000-0000-0000-000000000001'',''Enterprise'',''blue''),(''00000000-0000-0000-0000-000000000001'',''Referral'',''green'');

INSERT INTO software.lead_sources (workspace_id, name, kind, enabled) VALUES
(''00000000-0000-0000-0000-000000000001'',''LinkedIn'',''social'',false),(''00000000-0000-0000-0000-000000000001'',''Job boards'',''jobs'',false),
(''00000000-0000-0000-0000-000000000001'',''Funding news'',''news'',false),(''00000000-0000-0000-0000-000000000001'',''Website audit'',''crawler'',false);

INSERT INTO software.saved_searches (workspace_id, name, filters, alert) VALUES
(''00000000-0000-0000-0000-000000000001'',''Funded React companies'',''{"tech":"React","signal":"Funding"}'',true),
(''00000000-0000-0000-0000-000000000001'',''Hot leads 85+'',''{"minScore":85}'',false);

INSERT INTO software.outreach_sequences (workspace_id, name, steps, active) VALUES
(''00000000-0000-0000-0000-000000000001'',''Funding congrats'',''[{"day":0,"type":"email"},{"day":3,"type":"linkedin"},{"day":7,"type":"email"}]'',true);
']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261004151508','6da75c31-c0e1-4317-8023-7f61043157df',ARRAY['CREATE OR REPLACE FUNCTION software.join_demo_workspace() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = software AS $$
DECLARE ws uuid := ''00000000-0000-0000-0000-000000000001''; r software.member_role;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION ''not signed in''; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members WHERE user_id = auth.uid() LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  ws := ''00000000-0000-0000-0000-000000000001'';
  r := CASE WHEN EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = ws) THEN ''member'' ELSE ''owner'' END;
  INSERT INTO software.workspace_members (workspace_id, user_id, role) VALUES (ws, auth.uid(), r);
  RETURN ws;
END $$;
REVOKE EXECUTE ON FUNCTION software.join_demo_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION software.join_demo_workspace() TO authenticated;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261005202626','c0053909-4afd-476d-92ea-ce38755b95e6',ARRAY['CREATE TABLE software.job_scan_settings (
  workspace_id uuid PRIMARY KEY REFERENCES software.workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  keywords text[] NOT NULL DEFAULT ARRAY[''Full Stack Developer''],
  sources text[] NOT NULL DEFAULT ARRAY[''remotive'',''arbeitnow'',''hackernews'',''adzuna''],
  adzuna_country text NOT NULL DEFAULT ''us'',
  use_ai boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  locked_until timestamptz,
  paused_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  source text NOT NULL, external_id text NOT NULL, url text, title text NOT NULL,
  company_name text, location text, description text, posted_at timestamptz,
  matched_keywords text[] NOT NULL DEFAULT ''{}'',
  status text NOT NULL DEFAULT ''new'', extracted jsonb, error text,
  company_id uuid REFERENCES software.companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source, external_id)
);
CREATE INDEX ON software.job_postings(workspace_id, status, created_at);
CREATE TABLE software.job_scan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  trigger text NOT NULL DEFAULT ''schedule'',
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  status text NOT NULL DEFAULT ''running'',
  fetched int NOT NULL DEFAULT 0, matched int NOT NULL DEFAULT 0, new_postings int NOT NULL DEFAULT 0, leads_created int NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT ''[]'', error text
);
CREATE INDEX ON software.job_scan_runs(workspace_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON software.job_scan_settings, software.job_postings, software.job_scan_runs TO authenticated;
GRANT USAGE ON SCHEMA software TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA software TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA software TO service_role;

ALTER TABLE software.job_scan_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE software.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE software.job_scan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_select ON software.job_scan_settings FOR SELECT TO authenticated USING (software.is_member(workspace_id));
CREATE POLICY settings_admin ON software.job_scan_settings FOR ALL TO authenticated USING (software.is_admin(workspace_id)) WITH CHECK (software.is_admin(workspace_id));
CREATE POLICY postings_select ON software.job_postings FOR SELECT TO authenticated USING (software.is_member(workspace_id));
CREATE POLICY runs_select ON software.job_scan_runs FOR SELECT TO authenticated USING (software.is_member(workspace_id));

CREATE TRIGGER touch BEFORE UPDATE ON software.job_scan_settings FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();
CREATE TRIGGER touch BEFORE UPDATE ON software.job_postings FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();

INSERT INTO software.job_scan_settings (workspace_id) SELECT id FROM software.workspaces ON CONFLICT DO NOTHING;
INSERT INTO software.lead_sources (workspace_id, name, kind, enabled)
SELECT w.id, s.name, ''job_board'', true FROM software.workspaces w
CROSS JOIN (VALUES (''Remotive''),(''Arbeitnow''),(''Hacker News hiring''),(''Adzuna'')) AS s(name)
WHERE NOT EXISTS (SELECT 1 FROM software.lead_sources l WHERE l.workspace_id = w.id AND l.name = s.name);']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261006090836','3321c277-607a-4f76-b29e-d7981bfd4660',ARRAY['create table software.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references software.workspaces(id) on delete cascade,
  company_id uuid not null references software.companies(id) on delete cascade,
  title text not null default ''Software development opportunity'',
  stage software.pipeline_stage not null default ''New'',
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
  role text not null default ''Influencer'',
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
select l.id, c.id, c.workspace_id, case when c.is_decision_maker then ''Decision maker'' else ''Influencer'' end,
  c.id = (select c2.id from software.contacts c2 where c2.company_id = c.company_id order by c2.is_decision_maker desc, c2.created_at limit 1)
from software.contacts c join software.leads l on l.company_id = c.company_id;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261007085841','112bf6ab-9c9b-4e95-8509-dfcb7409dbad',ARRAY['CREATE TYPE software.signal_type AS ENUM (''hiring'',''funding'',''product_launch'',''leadership_change'',''tech_stack_change'',''news_mention'',''expansion'',''other'');
CREATE TYPE software.signal_source AS ENUM (''manual'',''imported'',''automated'');
CREATE TYPE software.signal_strength AS ENUM (''low'',''medium'',''high'');
CREATE TYPE software.signal_status AS ENUM (''new'',''reviewed'',''actioned'',''dismissed'');

ALTER TABLE software.signals
  ADD COLUMN lead_id uuid REFERENCES software.leads(id) ON DELETE SET NULL,
  ADD COLUMN title text,
  ADD COLUMN source software.signal_source NOT NULL DEFAULT ''manual'',
  ADD COLUMN status software.signal_status NOT NULL DEFAULT ''new'',
  ADD COLUMN created_by uuid DEFAULT auth.uid();

UPDATE software.signals SET title = left(description, 120), source = ''automated'';
ALTER TABLE software.signals ALTER COLUMN title SET NOT NULL;
ALTER TABLE software.signals ALTER COLUMN description DROP NOT NULL;

ALTER TABLE software.signals ALTER COLUMN type TYPE software.signal_type USING (
  CASE WHEN type ILIKE ''%job%'' OR type ILIKE ''%hiring%'' THEN ''hiring''
       WHEN type ILIKE ''%fund%'' THEN ''funding''
       WHEN type ILIKE ''%launch%'' OR type ILIKE ''%product%'' THEN ''product_launch''
       WHEN type ILIKE ''%executive%'' THEN ''leadership_change''
       WHEN type ILIKE ''%tech%'' THEN ''tech_stack_change''
       WHEN type ILIKE ''%expan%'' THEN ''expansion''
       ELSE ''other'' END)::software.signal_type;

ALTER TABLE software.signals ALTER COLUMN strength DROP DEFAULT;
ALTER TABLE software.signals ALTER COLUMN strength TYPE software.signal_strength USING (
  CASE WHEN strength >= 70 THEN ''high'' WHEN strength >= 40 THEN ''medium'' ELSE ''low'' END)::software.signal_strength;
ALTER TABLE software.signals ALTER COLUMN strength SET DEFAULT ''medium'';

CREATE INDEX IF NOT EXISTS signals_company_idx ON software.signals(company_id);
CREATE INDEX IF NOT EXISTS signals_type_idx ON software.signals(type);
CREATE INDEX IF NOT EXISTS signals_detected_idx ON software.signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS signals_lead_idx ON software.signals(lead_id);
GRANT USAGE ON TYPE software.signal_type, software.signal_source, software.signal_strength, software.signal_status TO authenticated, service_role;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261008090539','071bde67-8a59-4798-a040-1faeebd61ded',ARRAY['REVOKE EXECUTE ON FUNCTION software.is_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION software.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION software.join_demo_workspace() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION software.is_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION software.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION software.join_demo_workspace() TO authenticated, service_role;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261009100745','5d81c394-2f3e-47dd-b33f-b40135fd2a2f',ARRAY['CREATE POLICY "Signed-in users can view avatars" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''avatars'');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''avatars'' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''avatars'' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''avatars'' AND (storage.foldername(name))[1] = auth.uid()::text);']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261009102012','76c10857-7adc-4d36-9d55-c2728491b24a',ARRAY['ALTER TYPE software.member_role ADD VALUE IF NOT EXISTS ''manager'';

CREATE TABLE software.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role software.member_role NOT NULL DEFAULT ''member'',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX workspace_invitations_ws_email ON software.workspace_invitations (workspace_id, lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON software.workspace_invitations TO authenticated;
GRANT ALL ON software.workspace_invitations TO service_role;
ALTER TABLE software.workspace_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_select ON software.workspace_invitations FOR SELECT TO authenticated USING (software.is_member(workspace_id));
CREATE POLICY inv_admin ON software.workspace_invitations FOR ALL TO authenticated USING (software.is_admin(workspace_id)) WITH CHECK (software.is_admin(workspace_id) AND role::text <> ''owner'');

CREATE OR REPLACE FUNCTION software.list_members(_ws uuid)
RETURNS TABLE (user_id uuid, email text, full_name text, avatar_path text, role software.member_role, joined_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = software, public
AS $$
BEGIN
  IF NOT software.is_member(_ws) THEN RAISE EXCEPTION ''not a member''; END IF;
  RETURN QUERY
    SELECT m.user_id, u.email::text, (u.raw_user_meta_data->>''full_name'')::text, (u.raw_user_meta_data->>''avatar_path'')::text, m.role, m.created_at
    FROM software.workspace_members m JOIN auth.users u ON u.id = m.user_id
    WHERE m.workspace_id = _ws ORDER BY m.created_at;
END $$;
REVOKE EXECUTE ON FUNCTION software.list_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION software.list_members(uuid) TO authenticated;

-- Owner row is protected; nobody can be promoted to owner via the app.
CREATE OR REPLACE FUNCTION software.protect_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = software AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN (''UPDATE'',''DELETE'') AND OLD.role::text = ''owner'' THEN RAISE EXCEPTION ''The workspace owner cannot be changed or removed''; END IF;
  IF TG_OP IN (''INSERT'',''UPDATE'') AND NEW.role::text = ''owner'' THEN RAISE EXCEPTION ''Owner role cannot be assigned''; END IF;
  IF TG_OP = ''UPDATE'' AND (NEW.user_id <> OLD.user_id OR NEW.workspace_id <> OLD.workspace_id) THEN RAISE EXCEPTION ''Not allowed''; END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER workspace_members_protect_owner BEFORE INSERT OR UPDATE OR DELETE ON software.workspace_members FOR EACH ROW EXECUTE FUNCTION software.protect_owner();

CREATE OR REPLACE FUNCTION software.join_demo_workspace()
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''software''
AS $function$
DECLARE ws uuid; r software.member_role; inv record; em text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION ''not signed in''; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members WHERE user_id = auth.uid() LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  SELECT * INTO inv FROM software.workspace_invitations WHERE lower(email) = lower(em) ORDER BY created_at LIMIT 1;
  IF inv.id IS NOT NULL THEN
    ws := inv.workspace_id; r := inv.role;
    DELETE FROM software.workspace_invitations WHERE id = inv.id;
  ELSE
    ws := ''00000000-0000-0000-0000-000000000001'';
    r := CASE WHEN EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = ws) THEN ''member'' ELSE ''owner'' END;
  END IF;
  -- bypass owner-protection trigger for the system-assigned first owner
  PERFORM set_config(''request.jwt.claim.sub'', '''', true);
  INSERT INTO software.workspace_members (workspace_id, user_id, role) VALUES (ws, auth.uid(), r);
  RETURN ws;
END $function$;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261009102042','f7b37dd2-bb15-4c03-a1f8-a4c9f912cc33',ARRAY['CREATE OR REPLACE FUNCTION software.protect_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = software AS $$
BEGIN
  IF auth.uid() IS NULL OR current_setting(''software.system_join'', true) = ''on'' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN (''UPDATE'',''DELETE'') AND OLD.role::text = ''owner'' THEN RAISE EXCEPTION ''The workspace owner cannot be changed or removed''; END IF;
  IF TG_OP IN (''INSERT'',''UPDATE'') AND NEW.role::text = ''owner'' THEN RAISE EXCEPTION ''Owner role cannot be assigned''; END IF;
  IF TG_OP = ''UPDATE'' AND (NEW.user_id <> OLD.user_id OR NEW.workspace_id <> OLD.workspace_id) THEN RAISE EXCEPTION ''Not allowed''; END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION software.join_demo_workspace()
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''software''
AS $function$
DECLARE ws uuid; r software.member_role; inv record; em text; me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION ''not signed in''; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members WHERE user_id = me LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  SELECT email INTO em FROM auth.users WHERE id = me;
  SELECT * INTO inv FROM software.workspace_invitations WHERE lower(email) = lower(em) ORDER BY created_at LIMIT 1;
  IF inv.id IS NOT NULL THEN
    ws := inv.workspace_id; r := inv.role;
    DELETE FROM software.workspace_invitations WHERE id = inv.id;
  ELSE
    ws := ''00000000-0000-0000-0000-000000000001'';
    r := CASE WHEN EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = ws) THEN ''member'' ELSE ''owner'' END;
  END IF;
  PERFORM set_config(''software.system_join'', ''on'', true);
  INSERT INTO software.workspace_members (workspace_id, user_id, role) VALUES (ws, me, r);
  PERFORM set_config(''software.system_join'', ''off'', true);
  RETURN ws;
END $function$;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261010023511','bd4054be-25f5-4883-a057-d85039f4c81a',ARRAY['ALTER TABLE software.contacts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT ''Not contacted'', ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261011004427','d7f6cff3-d421-4d32-8d0c-b5260ddcfb3c',ARRAY['GRANT SELECT ON software.api_keys TO service_role; REVOKE ALL ON software.api_keys FROM anon, authenticated;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261012073122','c70c297c-e802-40ba-b121-6a411aac5d92',ARRAY['CREATE TABLE software.outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  company_id uuid,
  contact_id uuid,
  channel text NOT NULL DEFAULT ''Email'',
  subject text,
  message text,
  status text NOT NULL DEFAULT ''Sent'',
  reply text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  follow_up_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON software.outreach TO authenticated;
GRANT ALL ON software.outreach TO service_role;
ALTER TABLE software.outreach ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_all ON software.outreach FOR ALL TO authenticated USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id));
CREATE INDEX outreach_ws_idx ON software.outreach(workspace_id, sent_at DESC);']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261013080207','7fae78bc-0fe5-4a58-b710-b502db71d1af',ARRAY['UPDATE software.outreach o SET company_id=NULL WHERE company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM software.companies c WHERE c.id=o.company_id);
UPDATE software.outreach o SET contact_id=NULL WHERE contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM software.contacts c WHERE c.id=o.contact_id);
ALTER TABLE software.outreach ADD CONSTRAINT outreach_company_id_fkey FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE SET NULL;
ALTER TABLE software.outreach ADD CONSTRAINT outreach_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES software.contacts(id) ON DELETE SET NULL;
NOTIFY pgrst, ''reload schema'';']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261013083706','264c2cae-00c9-4fd6-ae0a-38248094c877',ARRAY['CREATE OR REPLACE FUNCTION public.enforce_allowed_signin_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.email,'''')) NOT IN (''ivan@teampass.me'',''ivan.teampass@gmail.com'') THEN
    RAISE EXCEPTION ''This email is not allowed to sign in'';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_allowed_signin_email() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_allowed_signin_email BEFORE INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_allowed_signin_email();

CREATE OR REPLACE FUNCTION public.join_teampass_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO software.workspace_members (workspace_id, user_id, role)
  VALUES (''00000000-0000-0000-0000-000000000001'', NEW.id, ''owner'')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.join_teampass_workspace() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER join_teampass_workspace AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.join_teampass_workspace();

UPDATE software.workspaces SET name = ''TeamPass'' WHERE id = ''00000000-0000-0000-0000-000000000001'';']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261014090350','5efcf68c-bbc2-4f9b-9d92-06309c989f95',ARRAY['CREATE TABLE software.site_content (
  id text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT ''{}''::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON software.site_content TO anon, authenticated;
GRANT INSERT, UPDATE ON software.site_content TO authenticated;
GRANT ALL ON software.site_content TO service_role;
ALTER TABLE software.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site content" ON software.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "TeamPass admins insert site content" ON software.site_content FOR INSERT TO authenticated WITH CHECK (software.is_admin(''00000000-0000-0000-0000-000000000001''));
CREATE POLICY "TeamPass admins update site content" ON software.site_content FOR UPDATE TO authenticated USING (software.is_admin(''00000000-0000-0000-0000-000000000001'')) WITH CHECK (software.is_admin(''00000000-0000-0000-0000-000000000001''));
CREATE TRIGGER site_content_touch BEFORE UPDATE ON software.site_content FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at();']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261014112914','c3d460a2-8d1b-4569-b2ff-25287f36f5ce',ARRAY['CREATE POLICY "Website admins manage slide images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''website-slides'' AND software.is_admin(''00000000-0000-0000-0000-000000000001''::uuid)) WITH CHECK (bucket_id = ''website-slides'' AND (storage.foldername(name))[1] = ''landing'' AND lower(storage.extension(name)) IN (''jpg'', ''jpeg'', ''png'', ''webp'', ''avif'') AND software.is_admin(''00000000-0000-0000-0000-000000000001''::uuid));
CREATE POLICY "Visitors read published slide images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = ''website-slides'' AND EXISTS (SELECT 1 FROM software.site_content s CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.content->''heroSlides'') = ''array'' THEN s.content->''heroSlides'' ELSE ''[]''::jsonb END) slide WHERE s.id = ''landing'' AND slide->>''path'' = storage.objects.name));']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261015094911','cd9c97de-2258-4f84-9884-959c4d22334e',ARRAY['GRANT USAGE ON SCHEMA software TO anon;
GRANT SELECT ON software.site_content TO anon;
NOTIFY pgrst, ''reload schema'';']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261016180112','2bdb9add-49d7-4840-ac6f-355be84cc51a',ARRAY['-- realestate schema app tables

create or replace function realestate.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create table realestate.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  city text not null default ''Belgrade'',
  area text not null,
  price_eur numeric(10,2) not null,
  beds integer not null default 1,
  baths integer not null default 1,
  size_m2 numeric(8,2) not null,
  furnished boolean not null default false,
  image_url text,
  source text not null,
  source_url text,
  found_at timestamptz not null default now(),
  score integer not null default 0,
  risk text not null default ''low'' check (risk in (''low'',''medium'',''high'')),
  duplicate_count integer not null default 0,
  map_x numeric(5,2) not null default 50,
  map_y numeric(5,2) not null default 50,
  status text not null default ''active'',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table realestate.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references realestate.listings(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table realestate.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text,
  areas text[] not null default ''{}'',
  min_price numeric(10,2),
  max_price numeric(10,2),
  property_type text,
  move_in_date date,
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table realestate.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references realestate.listings(id) on delete cascade,
  saved_search_id uuid references realestate.saved_searches(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table realestate.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default ''not_configured'',
  last_job_at timestamptz,
  quota_used integer not null default 0,
  quota_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table realestate.area_stats (
  id uuid primary key default gen_random_uuid(),
  area text,
  period text not null,
  avg_price numeric(10,2) not null,
  sample_size integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (area, period)
);

-- grants (realestate is not public: explicit schema usage required)
grant usage on schema realestate to anon, authenticated, service_role;
grant select on realestate.listings to authenticated;
grant all on realestate.listings to service_role;
grant select, insert, update, delete on realestate.favorites to authenticated;
grant all on realestate.favorites to service_role;
grant select, insert, update, delete on realestate.saved_searches to authenticated;
grant all on realestate.saved_searches to service_role;
grant select, insert, update, delete on realestate.alerts to authenticated;
grant all on realestate.alerts to service_role;
grant select on realestate.sources to authenticated;
grant all on realestate.sources to service_role;
grant select on realestate.area_stats to authenticated;
grant all on realestate.area_stats to service_role;

alter table realestate.listings enable row level security;
alter table realestate.favorites enable row level security;
alter table realestate.saved_searches enable row level security;
alter table realestate.alerts enable row level security;
alter table realestate.sources enable row level security;
alter table realestate.area_stats enable row level security;

create policy "Signed-in users can view listings" on realestate.listings for select to authenticated using (true);
create policy "Users view own favorites" on realestate.favorites for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own favorites" on realestate.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own favorites" on realestate.favorites for delete to authenticated using (auth.uid() = user_id);
create policy "Users update own favorites" on realestate.favorites for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own saved searches" on realestate.saved_searches for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own saved searches" on realestate.saved_searches for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own saved searches" on realestate.saved_searches for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own saved searches" on realestate.saved_searches for delete to authenticated using (auth.uid() = user_id);
create policy "Users view own alerts" on realestate.alerts for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own alerts" on realestate.alerts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own alerts" on realestate.alerts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own alerts" on realestate.alerts for delete to authenticated using (auth.uid() = user_id);
create policy "Signed-in users can view sources" on realestate.sources for select to authenticated using (true);
create policy "Signed-in users can view area stats" on realestate.area_stats for select to authenticated using (true);

create trigger set_listings_updated_at before update on realestate.listings for each row execute function realestate.set_updated_at();
create trigger set_saved_searches_updated_at before update on realestate.saved_searches for each row execute function realestate.set_updated_at();
create trigger set_sources_updated_at before update on realestate.sources for each row execute function realestate.set_updated_at();
create trigger set_area_stats_updated_at before update on realestate.area_stats for each row execute function realestate.set_updated_at();

-- seed: the 6 sample apartments shown in the UI
insert into realestate.listings (id, title, area, price_eur, beds, baths, size_m2, furnished, source, found_at, score, risk, duplicate_count, map_x, map_y) values
(''00000001-0000-0000-0000-000000000001'', ''Bright 2BR with skyline view'', ''Vračar'', 950, 2, 1, 72, true, ''Halo Oglasi'', now() - interval ''4 minutes'', 94, ''low'', 2, 38, 30),
(''00000001-0000-0000-0000-000000000002'', ''Terrace apartment with pool'', ''Dedinje'', 2400, 3, 2, 140, true, ''Facebook group'', now() - interval ''12 minutes'', 88, ''low'', 0, 22, 62),
(''00000001-0000-0000-0000-000000000003'', ''High-rise loft near river'', ''Belgrade Waterfront'', 1350, 2, 2, 88, false, ''4zida'', now() - interval ''31 minutes'', 81, ''medium'', 1, 55, 48),
(''00000001-0000-0000-0000-000000000004'', ''Cozy studio, quiet street'', ''Dorćol'', 480, 1, 1, 34, true, ''Reddit'', now() - interval ''1 hour'', 76, ''high'', 3, 62, 20),
(''00000001-0000-0000-0000-000000000005'', ''Renovated flat by the park'', ''Novi Beograd'', 720, 2, 1, 61, false, ''Nekretnine.rs'', now() - interval ''2 hours'', 72, ''low'', 0, 30, 80),
(''00000001-0000-0000-0000-000000000006'', ''Penthouse with two terraces'', ''Senjak'', 1800, 3, 2, 120, true, ''Instagram'', now() - interval ''3 hours'', 69, ''medium'', 1, 48, 70);

-- seed: admin sources
insert into realestate.sources (name, status) values
(''Rental portals (scraper)'', ''not_configured''),
(''Facebook Graph API'', ''credentials_needed''),
(''Reddit API'', ''credentials_needed''),
(''X API'', ''credentials_needed''),
(''RSS feeds'', ''not_configured'');

-- seed: average rent by neighborhood (current month) + city-wide monthly trend
insert into realestate.area_stats (area, period, avg_price, sample_size) values
(''Dedinje'', ''2026-10'', 1900, 12),
(''Senjak'', ''2026-10'', 1500, 9),
(''Belgrade Waterfront'', ''2026-10'', 1350, 15),
(''Vračar'', ''2026-10'', 980, 28),
(''Dorćol'', ''2026-10'', 850, 22),
(''Novi Beograd'', ''2026-10'', 720, 31);

insert into realestate.area_stats (area, period, avg_price, sample_size) values
(null, ''2025-11'', 810, 210),
(null, ''2025-12'', 830, 218),
(null, ''2026-01'', 845, 224),
(null, ''2026-02'', 860, 231),
(null, ''2026-03'', 880, 240),
(null, ''2026-04'', 870, 236),
(null, ''2026-05'', 900, 248),
(null, ''2026-06'', 920, 255),
(null, ''2026-07'', 935, 261),
(null, ''2026-08'', 950, 268),
(null, ''2026-09'', 960, 272),
(null, ''2026-10'', 975, 278);']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261016180431','287cc16b-68d0-4be9-8b3b-c41d3239ba50',ARRAY['alter function realestate.set_updated_at() set search_path = '''';

create or replace function realestate.set_updated_at()
returns trigger
language plpgsql
set search_path = ''''
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261016181247','df5684b8-0d37-4184-bc16-c8b32ebb6462',ARRAY['GRANT SELECT ON realestate.listings TO anon;
GRANT SELECT ON realestate.sources TO anon;
GRANT SELECT ON realestate.area_stats TO anon;

CREATE POLICY "Anyone can read listings" ON realestate.listings FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can read sources" ON realestate.sources FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can read area stats" ON realestate.area_stats FOR SELECT TO anon USING (true);']);
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261016212142','isolate_app_access',ARRAY['-- Shared Auth identifies a user; software membership authorizes CRM access.
-- Existing memberships (including the owner) are deliberately preserved.
DROP TRIGGER IF EXISTS enforce_allowed_signin_email ON auth.users;
DROP TRIGGER IF EXISTS join_teampass_workspace ON auth.users;
DROP FUNCTION IF EXISTS public.enforce_allowed_signin_email();
DROP FUNCTION IF EXISTS public.join_teampass_workspace();

CREATE OR REPLACE FUNCTION software.join_demo_workspace()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '''' AS $$
DECLARE
  me uuid := auth.uid();
  ws uuid;
  em text;
  confirmed_at timestamptz;
  inv software.workspace_invitations%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION ''Not signed in'' USING ERRCODE = ''42501''; END IF;
  -- Serialize simultaneous first visits by the same user.
  SELECT email, email_confirmed_at INTO em, confirmed_at
    FROM auth.users WHERE id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION ''Not signed in'' USING ERRCODE = ''42501''; END IF;
  SELECT workspace_id INTO ws FROM software.workspace_members
    WHERE user_id = me ORDER BY created_at, workspace_id LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;
  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION ''Verify your email before accepting a workspace invitation'' USING ERRCODE = ''42501'';
  END IF;
  SELECT * INTO inv FROM software.workspace_invitations
    WHERE lower(email) = lower(em) AND role <> ''owner''::software.member_role
      AND created_at > now() - interval ''7 days''
    ORDER BY created_at, id LIMIT 1 FOR UPDATE;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION ''You don''''t have access to this workspace. Ask an administrator for an invitation.'' USING ERRCODE = ''42501'';
  END IF;
  INSERT INTO software.workspace_members (workspace_id, user_id, role)
    VALUES (inv.workspace_id, me, inv.role);
  DELETE FROM software.workspace_invitations WHERE id = inv.id;
  RETURN inv.workspace_id;
END;
$$;
REVOKE ALL ON FUNCTION software.join_demo_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION software.join_demo_workspace() TO authenticated;

-- Invitation acceptance no longer needs a system flag that bypasses owner protection.
CREATE OR REPLACE FUNCTION software.protect_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = '''' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN (''UPDATE'',''DELETE'') AND OLD.role::text = ''owner'' THEN RAISE EXCEPTION ''The workspace owner cannot be changed or removed''; END IF;
  IF TG_OP IN (''INSERT'',''UPDATE'') AND NEW.role::text = ''owner'' THEN RAISE EXCEPTION ''Owner role cannot be assigned''; END IF;
  IF TG_OP = ''UPDATE'' AND (NEW.user_id <> OLD.user_id OR NEW.workspace_id <> OLD.workspace_id) THEN RAISE EXCEPTION ''Not allowed''; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TABLE realestate.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '''' CHECK (length(full_name) <= 120),
  preferred_city text NOT NULL DEFAULT ''Belgrade'' CHECK (length(preferred_city) <= 120),
  max_budget numeric(10,2) CHECK (max_budget >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE realestate.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON realestate.profiles TO authenticated;
GRANT ALL ON realestate.profiles TO service_role;
CREATE POLICY "Users manage own profile" ON realestate.profiles FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON realestate.profiles
  FOR EACH ROW EXECUTE FUNCTION realestate.set_updated_at();

-- Alert creation belongs to the future matching job. Users may only mark their own alerts read.
REVOKE INSERT, UPDATE ON realestate.alerts FROM authenticated;
GRANT UPDATE (is_read) ON realestate.alerts TO authenticated;
DROP POLICY IF EXISTS "Users insert own alerts" ON realestate.alerts;
ALTER TABLE realestate.saved_searches ALTER COLUMN alerts_enabled SET DEFAULT false;
CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx ON realestate.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS alerts_user_id_created_at_idx ON realestate.alerts(user_id, created_at DESC);

-- These exact IDs were inserted as demo inventory by the original migration.
-- Keep them for explicit demo mode without advertising them as live rentals.
UPDATE realestate.listings SET status = ''demo''
WHERE id IN (''00000001-0000-0000-0000-000000000001'', ''00000001-0000-0000-0000-000000000002'',
             ''00000001-0000-0000-0000-000000000003'', ''00000001-0000-0000-0000-000000000004'',
             ''00000001-0000-0000-0000-000000000005'', ''00000001-0000-0000-0000-000000000006'')
  AND source_url IS NULL AND status = ''active'';
']);
COMMIT;

