
CREATE SCHEMA IF NOT EXISTS software;
GRANT USAGE ON SCHEMA software TO authenticated, service_role;

CREATE TYPE software.member_role AS ENUM ('owner','admin','member');
CREATE TYPE software.pipeline_stage AS ENUM ('New','Researching','Qualified','Contacted','Meeting','Proposal','Negotiation','Won','Lost');

CREATE OR REPLACE FUNCTION software.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = software AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE software.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'starter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role software.member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE OR REPLACE FUNCTION software.is_member(_ws uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = software AS $$
  SELECT EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = _ws AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION software.is_admin(_ws uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = software AS $$
  SELECT EXISTS (SELECT 1 FROM software.workspace_members WHERE workspace_id = _ws AND user_id = auth.uid() AND role IN ('owner','admin'))
$$;

CREATE TABLE software.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, domain text, industry text, employees int, location text, funding text,
  technologies text[] NOT NULL DEFAULT '{}', lead_type text, source text,
  stage software.pipeline_stage NOT NULL DEFAULT 'New', owner_name text,
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
  title text NOT NULL, stage software.pipeline_stage NOT NULL DEFAULT 'New',
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
  title text NOT NULL, due_date date, priority text NOT NULL DEFAULT 'Medium', done boolean NOT NULL DEFAULT false,
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
  name text NOT NULL, filters jsonb NOT NULL DEFAULT '{}', alert boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE software.outreach_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, steps jsonb NOT NULL DEFAULT '[]', active boolean NOT NULL DEFAULT false,
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
  FOREACH t IN ARRAY ARRAY['companies','contacts','signals','deals','activities','tasks','notes','tags','company_tags','lead_sources','saved_searches','outreach_sequences'] LOOP
    EXECUTE format('ALTER TABLE software.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY member_all ON software.%I FOR ALL TO authenticated USING (software.is_member(workspace_id)) WITH CHECK (software.is_member(workspace_id))', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['workspaces','companies','contacts','signals','deals','activities','tasks','notes','tags','lead_sources','saved_searches','outreach_sequences'] LOOP
    EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON software.%I FOR EACH ROW EXECUTE FUNCTION software.touch_updated_at()', t);
  END LOOP;
END $$;

-- Demo data
INSERT INTO software.workspaces (id, name, plan) VALUES ('00000000-0000-0000-0000-000000000001','Stojsic Dev Studio','growth');

INSERT INTO software.companies (id, workspace_id, name, domain, industry, employees, location, funding, technologies, lead_type, source, stage, owner_name, lead_score, last_activity_at) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Northwind Health','northwindhealth.io','Healthcare',120,'Berlin, DE','Series A €8M','{React,Node.js,AWS}','Custom software','Funding news','Qualified','Ivan',92, now()-interval '1 day'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Brightcart','brightcart.com','E-commerce',45,'Amsterdam, NL','Seed €2M','{Shopify,PHP}','Store rebuild','Website audit','Contacted','Ivan',84, now()-interval '2 days'),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Fleetly Logistics','fleetly.eu','Logistics',300,'Vienna, AT',NULL,'{.NET,Angular,Azure}','Legacy modernization','Job board','Meeting','Ana',78, now()-interval '3 days'),
('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Ledgerly','ledgerly.app','Fintech',30,'London, UK','Pre-seed £750k','{Python,Django}','MVP build','Product Hunt','New','Ana',71, now()-interval '5 days'),
('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Studio Kraft','studiokraft.de','Agency',15,'Munich, DE',NULL,'{WordPress,jQuery}','White-label dev','Referral','Proposal','Ivan',66, now()-interval '1 day'),
('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','EduSpark','eduspark.org','Education',80,'Belgrade, RS','Grant €500k','{Vue,Laravel}','Mobile app','LinkedIn','Researching','Marko',58, now()-interval '8 days'),
('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','GreenGrid Energy','greengrid.energy','Energy',210,'Zagreb, HR','Series B €20M','{React,Go,GCP}','Data platform','Funding news','Negotiation','Marko',88, now()-interval '1 day'),
('10000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Bistro Chain Co','bistrochain.com','Hospitality',500,'Milan, IT',NULL,'{Wix}','Booking system','Website audit','New','Ana',41, now()-interval '14 days');

INSERT INTO software.contacts (workspace_id, company_id, first_name, last_name, title, email, is_decision_maker) VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Lena','Hoffmann','CTO','lena@northwindhealth.io',true),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Daan','de Vries','Founder','daan@brightcart.com',true),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Thomas','Gruber','Head of IT','t.gruber@fleetly.eu',true),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','Priya','Shah','CEO','priya@ledgerly.app',true),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','Jonas','Kraft','Managing Director','jonas@studiokraft.de',true),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','Milica','Jovanović','Product Lead','milica@eduspark.org',false),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000007','Ivo','Horvat','VP Engineering','ivo@greengrid.energy',true),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000008','Giulia','Rossi','Operations Manager','giulia@bistrochain.com',false);

INSERT INTO software.signals (workspace_id, company_id, type, description, strength, detected_at) VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Funding','Raised €8M Series A to expand platform',90, now()-interval '6 days'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Hiring','Hiring 3 senior React developers',80, now()-interval '2 days'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Outdated website','Store loads in 7.8s on mobile',75, now()-interval '4 days'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Legacy tech','Still running .NET Framework 4.5 portal',70, now()-interval '10 days'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','Product launch','Launched beta on Product Hunt',65, now()-interval '3 days'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','Outsourcing','Posted freelance dev request',70, now()-interval '1 day'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','RFP','Published tender for mobile learning app',60, now()-interval '9 days'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000007','Funding','Closed €20M Series B',95, now()-interval '5 days'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000008','No online booking','No reservation system on website',40, now()-interval '20 days');

INSERT INTO software.deals (workspace_id, company_id, title, stage, value, probability, expected_close) VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Patient portal rebuild','Qualified',45000,30, current_date+45),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Shopify performance revamp','Contacted',12000,20, current_date+30),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Fleet portal modernization','Meeting',80000,40, current_date+60),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','White-label dev retainer','Proposal',24000,60, current_date+20),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000007','Energy data platform','Negotiation',120000,75, current_date+14);

INSERT INTO software.activities (workspace_id, company_id, type, summary, occurred_at) VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','email','Sent intro email to Lena', now()-interval '1 day'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','meeting','Discovery call with Thomas', now()-interval '3 days'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000007','call','Pricing negotiation call', now()-interval '1 day'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','proposal','Sent proposal v2', now()-interval '1 day');

INSERT INTO software.tasks (workspace_id, company_id, title, due_date, priority, assignee_name) VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Follow up with Lena on scope', current_date+1,'High','Ivan'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Send performance audit PDF', current_date,'Medium','Ivan'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Prepare architecture proposal', current_date+3,'High','Ana'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000007','Send final contract', current_date+2,'High','Marko'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','Research tender requirements', current_date+5,'Low','Marko');

INSERT INTO software.notes (workspace_id, company_id, body) VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Budget approved for Q1; wants HIPAA-like compliance.'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000007','Decision expected after board meeting.');

INSERT INTO software.tags (workspace_id, name, color) VALUES
('00000000-0000-0000-0000-000000000001','Hot','orange'),('00000000-0000-0000-0000-000000000001','Enterprise','blue'),('00000000-0000-0000-0000-000000000001','Referral','green');

INSERT INTO software.lead_sources (workspace_id, name, kind, enabled) VALUES
('00000000-0000-0000-0000-000000000001','LinkedIn','social',false),('00000000-0000-0000-0000-000000000001','Job boards','jobs',false),
('00000000-0000-0000-0000-000000000001','Funding news','news',false),('00000000-0000-0000-0000-000000000001','Website audit','crawler',false);

INSERT INTO software.saved_searches (workspace_id, name, filters, alert) VALUES
('00000000-0000-0000-0000-000000000001','Funded React companies','{"tech":"React","signal":"Funding"}',true),
('00000000-0000-0000-0000-000000000001','Hot leads 85+','{"minScore":85}',false);

INSERT INTO software.outreach_sequences (workspace_id, name, steps, active) VALUES
('00000000-0000-0000-0000-000000000001','Funding congrats','[{"day":0,"type":"email"},{"day":3,"type":"linkedin"},{"day":7,"type":"email"}]',true);
