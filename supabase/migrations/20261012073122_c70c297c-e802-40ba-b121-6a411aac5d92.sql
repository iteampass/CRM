CREATE TABLE software.outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  company_id uuid,
  contact_id uuid,
  channel text NOT NULL DEFAULT 'Email',
  subject text,
  message text,
  status text NOT NULL DEFAULT 'Sent',
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
CREATE INDEX outreach_ws_idx ON software.outreach(workspace_id, sent_at DESC);