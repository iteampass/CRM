BEGIN;
SET LOCAL search_path = talent;
GRANT USAGE ON SCHEMA talent TO authenticated, service_role;

ALTER TABLE talent.position_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'interview_group';
ALTER TABLE talent.position_members ADD CONSTRAINT position_members_role_check CHECK (role IN ('position_admin', 'interview_group'));
ALTER TABLE talent.candidate_comments ADD COLUMN IF NOT EXISTS interview_id uuid REFERENCES talent.interviews(id) ON DELETE SET NULL;
CREATE TABLE talent.interview_attendees (
  interview_id uuid NOT NULL REFERENCES talent.interviews(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES talent.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (interview_id, profile_id)
);
ALTER TABLE talent.interview_attendees ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON talent.interview_attendees TO authenticated;
GRANT ALL ON talent.interview_attendees TO service_role;
GRANT UPDATE ON talent.position_members TO authenticated;

CREATE OR REPLACE FUNCTION talent.can_access_position(_position_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = talent AS $$
 SELECT EXISTS (SELECT 1 FROM positions p WHERE p.id = _position_id AND p.workspace_id = current_workspace_id()
 AND (is_workspace_admin(p.workspace_id) OR EXISTS (SELECT 1 FROM position_members m JOIN profiles u ON u.id=m.profile_id
 WHERE m.position_id=p.id AND u.user_id=auth.uid() AND u.workspace_id=p.workspace_id)))
$$;
CREATE OR REPLACE FUNCTION talent.can_manage_position(_position_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = talent AS $$
 SELECT EXISTS (SELECT 1 FROM positions p WHERE p.id = _position_id AND p.workspace_id = current_workspace_id()
 AND (is_workspace_admin(p.workspace_id) OR EXISTS (SELECT 1 FROM position_members m JOIN profiles u ON u.id=m.profile_id
 WHERE m.position_id=p.id AND m.role='position_admin' AND u.user_id=auth.uid() AND u.workspace_id=p.workspace_id)))
$$;
CREATE OR REPLACE FUNCTION talent.can_access_candidate(_candidate_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = talent AS $$
 SELECT EXISTS (SELECT 1 FROM candidates c WHERE c.id=_candidate_id AND c.workspace_id=current_workspace_id()
 AND (is_workspace_admin(c.workspace_id) OR can_access_position(c.position_id)))
$$;
CREATE OR REPLACE FUNCTION talent.can_manage_candidate(_candidate_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = talent AS $$
 SELECT EXISTS (SELECT 1 FROM candidates c WHERE c.id=_candidate_id AND c.workspace_id=current_workspace_id()
 AND (is_workspace_admin(c.workspace_id) OR can_manage_position(c.position_id)))
$$;
CREATE OR REPLACE FUNCTION talent.can_comment_on_interview(_interview_id uuid, _candidate_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = talent AS $$
 SELECT EXISTS (SELECT 1 FROM interviews i JOIN candidates c ON c.id=i.candidate_id
 JOIN interview_attendees a ON a.interview_id=i.id JOIN profiles u ON u.id=a.profile_id
 JOIN position_members m ON m.profile_id=u.id AND m.position_id=c.position_id
 WHERE i.id=_interview_id AND i.candidate_id=_candidate_id AND i.status='completed' AND i.interview_date<=now()
 AND u.user_id=auth.uid() AND u.workspace_id=c.workspace_id AND c.workspace_id=current_workspace_id()
 AND m.role='interview_group')
$$;
CREATE OR REPLACE FUNCTION talent.can_access_resume(object_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = talent AS $$
 SELECT EXISTS (SELECT 1 FROM candidates c WHERE c.id::text=split_part(object_name,'/',1) AND can_access_candidate(c.id))
$$;
CREATE OR REPLACE FUNCTION talent.can_manage_resume(object_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = talent AS $$
 SELECT EXISTS (SELECT 1 FROM candidates c WHERE c.id::text=split_part(object_name,'/',1) AND can_manage_candidate(c.id))
$$;

-- Replace permissive policies: policies are ORed, so old workspace-wide grants must not survive.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='talent'
 AND tablename IN ('positions','candidates','interviews','candidate_comments','position_members') LOOP
 EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
 END LOOP;
END $$;

CREATE POLICY privilege_position_read ON talent.positions FOR SELECT TO authenticated USING (can_access_position(id));
CREATE POLICY privilege_position_create ON talent.positions FOR INSERT TO authenticated WITH CHECK (workspace_id=current_workspace_id() AND is_workspace_admin(workspace_id));
CREATE POLICY privilege_position_update ON talent.positions FOR UPDATE TO authenticated USING (can_manage_position(id)) WITH CHECK (workspace_id=current_workspace_id() AND can_manage_position(id));
CREATE POLICY privilege_position_delete ON talent.positions FOR DELETE TO authenticated USING (can_manage_position(id));
CREATE POLICY privilege_candidate_read ON talent.candidates FOR SELECT TO authenticated USING (can_access_candidate(id));
CREATE POLICY privilege_candidate_create ON talent.candidates FOR INSERT TO authenticated WITH CHECK (workspace_id=current_workspace_id() AND (is_workspace_admin(workspace_id) OR can_manage_position(position_id)));
CREATE POLICY privilege_candidate_update ON talent.candidates FOR UPDATE TO authenticated USING (can_manage_candidate(id)) WITH CHECK (workspace_id=current_workspace_id() AND (is_workspace_admin(workspace_id) OR can_manage_position(position_id)));
CREATE POLICY privilege_candidate_delete ON talent.candidates FOR DELETE TO authenticated USING (can_manage_candidate(id));
CREATE POLICY privilege_interview_read ON talent.interviews FOR SELECT TO authenticated USING (can_access_candidate(candidate_id));
CREATE POLICY privilege_interview_create ON talent.interviews FOR INSERT TO authenticated WITH CHECK (can_manage_candidate(candidate_id));
CREATE POLICY privilege_interview_update ON talent.interviews FOR UPDATE TO authenticated USING (can_manage_candidate(candidate_id)) WITH CHECK (can_manage_candidate(candidate_id));
CREATE POLICY privilege_interview_delete ON talent.interviews FOR DELETE TO authenticated USING (can_manage_candidate(candidate_id));
CREATE POLICY privilege_comment_read ON talent.candidate_comments FOR SELECT TO authenticated USING (can_access_candidate(candidate_id));
CREATE POLICY privilege_comment_create ON talent.candidate_comments FOR INSERT TO authenticated WITH CHECK (
 author_id IN (SELECT id FROM talent.profiles WHERE user_id=auth.uid())
 AND (can_manage_candidate(candidate_id) OR can_comment_on_interview(interview_id,candidate_id))
 AND (interview_id IS NULL OR EXISTS (SELECT 1 FROM talent.interviews i WHERE i.id=interview_id AND i.candidate_id=candidate_comments.candidate_id))
);
CREATE POLICY privilege_comment_update ON talent.candidate_comments FOR UPDATE TO authenticated USING (can_manage_candidate(candidate_id)) WITH CHECK (can_manage_candidate(candidate_id));
CREATE POLICY privilege_comment_delete ON talent.candidate_comments FOR DELETE TO authenticated USING (can_manage_candidate(candidate_id));
CREATE POLICY privilege_members_read ON talent.position_members FOR SELECT TO authenticated USING (can_access_position(position_id));
CREATE POLICY privilege_members_write ON talent.position_members FOR ALL TO authenticated USING (
 EXISTS (SELECT 1 FROM talent.positions p WHERE p.id=position_id AND is_workspace_admin(p.workspace_id))
) WITH CHECK (
 EXISTS (SELECT 1 FROM talent.positions p JOIN talent.profiles u ON u.workspace_id=p.workspace_id WHERE p.id=position_id AND u.id=profile_id AND is_workspace_admin(p.workspace_id))
);
CREATE POLICY privilege_attendance_read ON talent.interview_attendees FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM talent.interviews i WHERE i.id=interview_id AND can_access_candidate(i.candidate_id))
);
CREATE POLICY privilege_attendance_insert ON talent.interview_attendees FOR INSERT TO authenticated WITH CHECK (
 EXISTS (SELECT 1 FROM talent.interviews i JOIN talent.candidates c ON c.id=i.candidate_id
 JOIN talent.position_members m ON m.position_id=c.position_id JOIN talent.profiles u ON u.id=m.profile_id
 WHERE i.id=interview_id AND u.id=interview_attendees.profile_id AND u.workspace_id=c.workspace_id
 AND i.status='completed' AND i.interview_date<=now() AND can_manage_candidate(c.id))
);
CREATE POLICY privilege_attendance_delete ON talent.interview_attendees FOR DELETE TO authenticated USING (
 EXISTS (SELECT 1 FROM talent.interviews i WHERE i.id=interview_id AND can_manage_candidate(i.candidate_id))
);

-- Keep read access to resumes separate from upload/update/delete access.
UPDATE storage.buckets SET public=false WHERE id='resumes';
DROP POLICY IF EXISTS "Workspace members can read their resumes" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can upload their resumes" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can update their resumes" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can delete their resumes" ON storage.objects;
DROP POLICY IF EXISTS "Team can read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Team can upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Team can update resumes" ON storage.objects;
DROP POLICY IF EXISTS "Team can delete resumes" ON storage.objects;
CREATE POLICY privilege_resume_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='resumes' AND can_access_resume(name));
CREATE POLICY privilege_resume_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='resumes' AND can_manage_resume(name));
CREATE POLICY privilege_resume_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='resumes' AND can_manage_resume(name)) WITH CHECK (bucket_id='resumes' AND can_manage_resume(name));
CREATE POLICY privilege_resume_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='resumes' AND can_manage_resume(name));

-- Prevent direct edits to the admin array. The RPC serializes changes and protects the last admin.
REVOKE UPDATE ON talent.workspace FROM authenticated;
CREATE OR REPLACE FUNCTION talent.set_workspace_admin(_profile_id uuid, _enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = talent AS $$
DECLARE w talent.workspace; target talent.profiles;
BEGIN
 SELECT * INTO w FROM talent.workspace WHERE id=current_workspace_id() FOR UPDATE;
 IF w.id IS NULL OR NOT is_workspace_admin(w.id) THEN RAISE EXCEPTION 'Only workspace admins can change privileges'; END IF;
 SELECT * INTO target FROM talent.profiles WHERE id=_profile_id AND workspace_id=w.id;
 IF target.id IS NULL OR target.user_id IS NULL THEN RAISE EXCEPTION 'User is not a member of this workspace'; END IF;
 IF _enabled THEN
   UPDATE talent.workspace SET workspace_admins=ARRAY(SELECT DISTINCT unnest(w.workspace_admins || target.user_id)) WHERE id=w.id;
 ELSE
   IF target.user_id=ANY(w.workspace_admins) AND cardinality(w.workspace_admins)<=1 THEN RAISE EXCEPTION 'Cannot remove the last workspace admin'; END IF;
   UPDATE talent.workspace SET workspace_admins=array_remove(w.workspace_admins,target.user_id) WHERE id=w.id;
 END IF;
END $$;

-- Avoid exposing the full workspace directory to unassigned users.
CREATE OR REPLACE FUNCTION talent.can_access_profile(_profile_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = talent AS $$
 SELECT EXISTS (SELECT 1 FROM profiles target WHERE target.id=_profile_id AND
 (target.user_id=auth.uid() OR (target.workspace_id=current_workspace_id() AND
 (is_workspace_admin(target.workspace_id) OR EXISTS (
 SELECT 1 FROM position_members theirs JOIN position_members mine ON mine.position_id=theirs.position_id
 JOIN profiles me ON me.id=mine.profile_id WHERE theirs.profile_id=target.id AND me.user_id=auth.uid() AND me.workspace_id=target.workspace_id)))))
$$;
DROP POLICY IF EXISTS "Users can insert own profile" ON talent.profiles;
CREATE POLICY privilege_profile_insert ON talent.profiles FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND workspace_id IS NULL);
DROP POLICY IF EXISTS "Team can view profiles" ON talent.profiles;
CREATE POLICY privilege_profile_read ON talent.profiles FOR SELECT TO authenticated USING (can_access_profile(id));
REVOKE ALL ON FUNCTION talent.can_access_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION talent.can_access_profile(uuid) TO authenticated, service_role;

-- Run as the caller: SECURITY DEFINER here would make every caller appear to be postgres.
CREATE OR REPLACE FUNCTION talent.guard_profile_workspace() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = talent AS $$
BEGIN
 IF (NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id)
 AND current_user NOT IN ('service_role','postgres','supabase_admin') THEN
   RAISE EXCEPTION 'Profile identity and workspace can only be changed by trusted membership actions';
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION talent.remove_workspace_member(_profile_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = talent AS $$
DECLARE w talent.workspace; target talent.profiles;
BEGIN
 SELECT * INTO w FROM talent.workspace WHERE id=current_workspace_id() FOR UPDATE;
 IF w.id IS NULL OR NOT is_workspace_admin(w.id) THEN RAISE EXCEPTION 'Only workspace admins can remove members'; END IF;
 SELECT * INTO target FROM talent.profiles WHERE id=_profile_id AND workspace_id=w.id FOR UPDATE;
 IF target.id IS NULL THEN RAISE EXCEPTION 'User is not a member of this workspace'; END IF;
 IF target.user_id=ANY(w.workspace_admins) AND cardinality(w.workspace_admins)<=1 THEN RAISE EXCEPTION 'Cannot remove the last workspace admin'; END IF;
 UPDATE talent.workspace SET workspace_admins=array_remove(w.workspace_admins,target.user_id) WHERE id=w.id;
 UPDATE talent.profiles SET workspace_id=NULL WHERE id=target.id;
END $$;
REVOKE ALL ON FUNCTION talent.remove_workspace_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION talent.remove_workspace_member(uuid) TO authenticated, service_role;

-- Membership removal invalidates stored grants so rejoining does not restore old access.
CREATE OR REPLACE FUNCTION talent.clear_member_privileges() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = talent AS $$
BEGIN
 IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
   DELETE FROM talent.position_members WHERE profile_id=OLD.id;
   DELETE FROM talent.interview_attendees WHERE profile_id=OLD.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER clear_member_privileges AFTER UPDATE OF workspace_id ON talent.profiles FOR EACH ROW EXECUTE FUNCTION talent.clear_member_privileges();

DO $$ DECLARE f text; BEGIN
 FOREACH f IN ARRAY ARRAY['can_access_position(uuid)','can_manage_position(uuid)','can_access_candidate(uuid)','can_manage_candidate(uuid)','can_comment_on_interview(uuid,uuid)','can_access_resume(text)','can_manage_resume(text)','set_workspace_admin(uuid,boolean)'] LOOP
 EXECUTE 'REVOKE ALL ON FUNCTION talent.'||f||' FROM PUBLIC, anon';
 EXECUTE 'GRANT EXECUTE ON FUNCTION talent.'||f||' TO authenticated, service_role';
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION talent.clear_member_privileges() FROM PUBLIC, anon, authenticated;
COMMIT;
