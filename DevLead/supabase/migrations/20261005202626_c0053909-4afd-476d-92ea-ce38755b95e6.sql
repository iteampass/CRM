CREATE TABLE software.job_scan_settings (
  workspace_id uuid PRIMARY KEY REFERENCES software.workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  keywords text[] NOT NULL DEFAULT ARRAY['Full Stack Developer'],
  sources text[] NOT NULL DEFAULT ARRAY['remotive','arbeitnow','hackernews','adzuna'],
  adzuna_country text NOT NULL DEFAULT 'us',
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
  matched_keywords text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new', extracted jsonb, error text,
  company_id uuid REFERENCES software.companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source, external_id)
);
CREATE INDEX ON software.job_postings(workspace_id, status, created_at);
CREATE TABLE software.job_scan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES software.workspaces(id) ON DELETE CASCADE,
  trigger text NOT NULL DEFAULT 'schedule',
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  fetched int NOT NULL DEFAULT 0, matched int NOT NULL DEFAULT 0, new_postings int NOT NULL DEFAULT 0, leads_created int NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT '[]', error text
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
SELECT w.id, s.name, 'job_board', true FROM software.workspaces w
CROSS JOIN (VALUES ('Remotive'),('Arbeitnow'),('Hacker News hiring'),('Adzuna')) AS s(name)
WHERE NOT EXISTS (SELECT 1 FROM software.lead_sources l WHERE l.workspace_id = w.id AND l.name = s.name);