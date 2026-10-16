UPDATE software.outreach o SET company_id=NULL WHERE company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM software.companies c WHERE c.id=o.company_id);
UPDATE software.outreach o SET contact_id=NULL WHERE contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM software.contacts c WHERE c.id=o.contact_id);
ALTER TABLE software.outreach ADD CONSTRAINT outreach_company_id_fkey FOREIGN KEY (company_id) REFERENCES software.companies(id) ON DELETE SET NULL;
ALTER TABLE software.outreach ADD CONSTRAINT outreach_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES software.contacts(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';