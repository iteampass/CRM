/**
 * Workspace context - which workspace the signed-in user belongs to,
 * its name, and whether the user is one of its admins.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface WorkspaceState {
  ready: boolean;
  workspaceId: number | null;
  workspaceName: string;
  isAdmin: boolean;
  canCreateCandidate: boolean;
  canViewCandidates: boolean;
  canUploadCandidateResume: (candidate: { positionId: string; createdBy?: string | null }) => boolean;
  refresh: () => Promise<void>;
  positionRoles: Record<string, "position_admin" | "interview_group">;
  attendedInterviews: string[];
  canManagePosition: (positionId: string) => boolean;
  accessVersion: number;
  accessError: string;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export const INVITE_STORAGE_KEY = "tc.invite-code";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [candidatePrivileges, setCandidatePrivileges] = useState({ can_create: false, can_view: false });
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [positionRoles, setPositionRoles] = useState<Record<string, "position_admin" | "interview_group">>({});
  const [attendedInterviews, setAttendedInterviews] = useState<string[]>([]);
  const [accessVersion, setAccessVersion] = useState(0);
  const [accessError, setAccessError] = useState("");

  const refresh = useCallback(async () => {
    const { data: session } = await supabase.auth.getUser();
    const authId = session.user?.id;
    setAuthUserId(authId ?? null);
    setCandidatePrivileges({ can_create: false, can_view: false });
    if (!authId) {
      setPositionRoles({});
      setAttendedInterviews([]);
      setAccessError("");
      setWorkspaceId(null);
      setWorkspaceName("");
      setIsAdmin(false);
      setReady(true);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, workspace_id")
      .eq("user_id", authId)
      .maybeSingle();

    const id = profile?.workspace_id ?? null;
    setWorkspaceId(id);

    if (id) {
      const { data: ws } = await supabase
        .from("workspace")
        .select("workspace_name, workspace_admins")
        .eq("id", id)
        .maybeSingle();
      setWorkspaceName(ws?.workspace_name ?? "");
      setIsAdmin(Boolean(ws?.workspace_admins?.includes(authId)));
    } else {
      setPositionRoles({});
      setAttendedInterviews([]);
      setAccessError("");
      setWorkspaceName("");
      setIsAdmin(false);
    }
    if (id && profile) {
      const [candidateAccess, roles, attendance] = await Promise.all([
        supabase.from("candidate_privileges").select("can_create, can_view").eq("profile_id", profile.id).maybeSingle(),
        supabase.from("position_members").select("position_id, role").eq("profile_id", profile.id),
        supabase.from("interview_attendees").select("interview_id").eq("profile_id", profile.id),
      ]);
      setCandidatePrivileges(candidateAccess.data ?? { can_create: false, can_view: false });
      setAccessError(roles.error || attendance.error || candidateAccess.error ? "Workspace privileges could not be loaded. Ask your administrator to complete the privileges setup, then reload this page." : "");
      setPositionRoles(Object.fromEntries((roles.data ?? []).map((r) => [r.position_id, r.role])));
      setAttendedInterviews((attendance.data ?? []).map((r) => r.interview_id));
    }
    setAccessVersion((v) => v + 1);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    const reload = () => { void refresh(); };
    window.addEventListener("focus", reload);
    window.addEventListener("privileges-updated", reload);
    return () => { window.removeEventListener("focus", reload); window.removeEventListener("privileges-updated", reload); };
  }, [refresh, user?.id]);

  const value = useMemo<WorkspaceState>(
    () => ({ canCreateCandidate: isAdmin || candidatePrivileges.can_create, canViewCandidates: isAdmin || candidatePrivileges.can_view,
      canUploadCandidateResume: (candidate) => isAdmin || positionRoles[candidate.positionId] === "position_admin" || (candidatePrivileges.can_create && !!authUserId && candidate.createdBy === authUserId), ready, workspaceId, workspaceName, isAdmin, refresh, positionRoles, attendedInterviews, accessVersion, accessError, canManagePosition: (positionId: string) => isAdmin || positionRoles[positionId] === "position_admin" }),
    [ready, workspaceId, workspaceName, isAdmin, refresh, positionRoles, attendedInterviews, accessVersion, accessError, candidatePrivileges, authUserId],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
