CREATE TYPE software.signal_type AS ENUM ('hiring','funding','product_launch','leadership_change','tech_stack_change','news_mention','expansion','other');
CREATE TYPE software.signal_source AS ENUM ('manual','imported','automated');
CREATE TYPE software.signal_strength AS ENUM ('low','medium','high');
CREATE TYPE software.signal_status AS ENUM ('new','reviewed','actioned','dismissed');

ALTER TABLE software.signals
  ADD COLUMN lead_id uuid REFERENCES software.leads(id) ON DELETE SET NULL,
  ADD COLUMN title text,
  ADD COLUMN source software.signal_source NOT NULL DEFAULT 'manual',
  ADD COLUMN status software.signal_status NOT NULL DEFAULT 'new',
  ADD COLUMN created_by uuid DEFAULT auth.uid();

UPDATE software.signals SET title = left(description, 120), source = 'automated';
ALTER TABLE software.signals ALTER COLUMN title SET NOT NULL;
ALTER TABLE software.signals ALTER COLUMN description DROP NOT NULL;

ALTER TABLE software.signals ALTER COLUMN type TYPE software.signal_type USING (
  CASE WHEN type ILIKE '%job%' OR type ILIKE '%hiring%' THEN 'hiring'
       WHEN type ILIKE '%fund%' THEN 'funding'
       WHEN type ILIKE '%launch%' OR type ILIKE '%product%' THEN 'product_launch'
       WHEN type ILIKE '%executive%' THEN 'leadership_change'
       WHEN type ILIKE '%tech%' THEN 'tech_stack_change'
       WHEN type ILIKE '%expan%' THEN 'expansion'
       ELSE 'other' END)::software.signal_type;

ALTER TABLE software.signals ALTER COLUMN strength DROP DEFAULT;
ALTER TABLE software.signals ALTER COLUMN strength TYPE software.signal_strength USING (
  CASE WHEN strength >= 70 THEN 'high' WHEN strength >= 40 THEN 'medium' ELSE 'low' END)::software.signal_strength;
ALTER TABLE software.signals ALTER COLUMN strength SET DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS signals_company_idx ON software.signals(company_id);
CREATE INDEX IF NOT EXISTS signals_type_idx ON software.signals(type);
CREATE INDEX IF NOT EXISTS signals_detected_idx ON software.signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS signals_lead_idx ON software.signals(lead_id);
GRANT USAGE ON TYPE software.signal_type, software.signal_source, software.signal_strength, software.signal_status TO authenticated, service_role;