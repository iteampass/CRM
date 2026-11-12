BEGIN;
SET LOCAL search_path = talent;
GRANT USAGE ON SCHEMA talent TO authenticated, service_role;
CREATE TABLE talent.candidate_privileges (
 profile_id uuid PRIMARY KEY REFERENCES talent.profiles(id) ON DELETE CASCADE,
 can_create boolean NOT NULL DEFAULT false,
 can_view boolean NOT NULL DEFAULT false
);
ALTER TABLE talent.candidate_privileges ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON talent.candidate_privileges TO authenticated;
GRANT ALL ON talent.candidate_privileges TO service_role;
CREATE POLICY candidate_privileges_read ON talent.candidate_privileges FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM talent.profiles p WHERE p.id=profile_id AND p.workspace_id=current_workspace_id() AND (p.user_id=auth.uid() OR is_workspace_admin(p.workspace_id)))
);
CREATE POLICY candidate_privileges_write ON talent.candidate_privileges FOR ALL TO authenticated USING (
 EXISTS (SELECT 1 FROM talent.profiles p WHERE p.id=profile_id AND p.workspace_id=current_workspace_id() AND is_workspace_admin(p.workspace_id))
) WITH CHECK (
 EXISTS (SELECT 1 FROM talent.profiles p WHERE p.id=profile_id AND p.workspace_id=current_workspace_id() AND is_workspace_admin(p.workspace_id))
);
ALTER TABLE talent.candidates ADD COLUMN created_by uuid DEFAULT auth.uid();
CREATE FUNCTION talent.has_candidate_privilege(_privilege text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=talent AS $$
 SELECT EXISTS (SELECT 1 FROM candidate_privileges g JOIN profiles p ON p.id=g.profile_id WHERE p.user_id=auth.uid() AND p.workspace_id=current_workspace_id()
 AND CASE _privilege WHEN 'create' THEN g.can_create WHEN 'view' THEN g.can_view ELSE false END)
$$;
CREATE OR REPLACE FUNCTION talent.can_access_candidate(_candidate_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=talent AS $$
 SELECT EXISTS (SELECT 1 FROM candidates c WHERE c.id=_candidate_id AND c.workspace_id=current_workspace_id()
 AND (is_workspace_admin(c.workspace_id) OR can_access_position(c.position_id) OR has_candidate_privilege('view') OR (c.created_by=auth.uid() AND has_candidate_privilege('create'))))
$$;
CREATE FUNCTION talent.can_upload_candidate_resume(_candidate_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=talent AS $$
 SELECT can_manage_candidate(_candidate_id) OR EXISTS (SELECT 1 FROM candidates c WHERE c.id=_candidate_id AND c.workspace_id=current_workspace_id() AND c.created_by=auth.uid() AND has_candidate_privilege('create'))
$$;
DROP POLICY privilege_candidate_create ON talent.candidates;
CREATE POLICY privilege_candidate_create ON talent.candidates FOR INSERT TO authenticated WITH CHECK (
 workspace_id=current_workspace_id() AND created_by=auth.uid() AND (is_workspace_admin(workspace_id) OR can_manage_position(position_id) OR (has_candidate_privilege('create') AND (position_id IS NULL OR can_access_position(position_id))))
);
DROP POLICY privilege_candidate_update ON talent.candidates;
CREATE POLICY privilege_candidate_update ON talent.candidates FOR UPDATE TO authenticated USING (can_upload_candidate_resume(id)) WITH CHECK (
 workspace_id=current_workspace_id() AND (is_workspace_admin(workspace_id) OR can_manage_position(position_id) OR (created_by=auth.uid() AND has_candidate_privilege('create')))
);
-- Creation rights allow resume work, not reassignment, status changes, or ownership spoofing.
CREATE FUNCTION talent.guard_candidate_privilege_update() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=talent AS $$
BEGIN
 IF current_user NOT IN ('service_role','postgres','supabase_admin') THEN
   IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Candidate creator cannot be changed'; END IF;
   IF NOT can_manage_candidate(OLD.id) AND
      (to_jsonb(NEW) - ARRAY['resume_url','resume_meta','resume_text','updated_at']) IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['resume_url','resume_meta','resume_text','updated_at']) THEN
     RAISE EXCEPTION 'Create candidate privilege only permits resume uploads after creation';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_candidate_privilege_update BEFORE UPDATE ON talent.candidates FOR EACH ROW EXECUTE FUNCTION talent.guard_candidate_privilege_update();
CREATE OR REPLACE FUNCTION talent.can_manage_resume(object_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=talent AS $$
 SELECT EXISTS (SELECT 1 FROM candidates c WHERE c.id::text=split_part(object_name,'/',1) AND can_upload_candidate_resume(c.id))
$$;
CREATE OR REPLACE FUNCTION talent.clear_member_privileges() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=talent AS $$
BEGIN
 IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
   DELETE FROM talent.position_members WHERE profile_id=OLD.id;
   DELETE FROM talent.interview_attendees WHERE profile_id=OLD.id;
   DELETE FROM talent.candidate_privileges WHERE profile_id=OLD.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION talent.has_candidate_privilege(text), talent.can_upload_candidate_resume(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION talent.has_candidate_privilege(text), talent.can_upload_candidate_resume(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION talent.guard_candidate_privilege_update() FROM PUBLIC, anon, authenticated;
COMMIT;
