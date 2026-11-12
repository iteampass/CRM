import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useRecruitment } from "@/data/store";
import { useWorkspace } from "@/lib/workspace";
import type { Interview } from "@/lib/types";

export function InterviewAttendance({
  interview,
  positionId,
}: {
  interview: Interview;
  positionId: string;
}) {
  const { users } = useRecruitment();
  const { canManagePosition, refresh } = useWorkspace();
  const [members, setMembers] = useState<string[]>([]);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const manage = canManagePosition(positionId);
  const completed =
    interview.status === "completed" && new Date(interview.interviewDate) <= new Date();
  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      supabase.from("position_members").select("profile_id").eq("position_id", positionId),
      supabase.from("interview_attendees").select("profile_id").eq("interview_id", interview.id),
    ]).then(([m, a]) => {
      if (!active) return;
      if (m.error || a.error) setError("Could not load interview attendance.");
      else {
        setMembers((m.data ?? []).map((r) => r.profile_id));
        setAttendees((a.data ?? []).map((r) => r.profile_id));
        setError("");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [positionId, interview.id]);
  const toggle = async (profileId: string, checked: boolean) => {
    setBusy(true);
    try {
      const result = checked
        ? await supabase
            .from("interview_attendees")
            .insert({ interview_id: interview.id, profile_id: profileId })
        : await supabase
            .from("interview_attendees")
            .delete()
            .eq("interview_id", interview.id)
            .eq("profile_id", profileId);
      if (result.error) throw result.error;
      setAttendees((previous) =>
        checked ? [...previous, profileId] : previous.filter((id) => id !== profileId),
      );
      await refresh();
    } catch {
      toast.error("Could not save attendance.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel mt-4 space-y-3 p-4">
      <h2 className="text-sm font-semibold">Interview attendance</h2>
      <p className="text-muted-foreground text-xs">
        {manage
          ? "Mark group members who attended after completing the interview. This allows them to add comments about this interview."
          : "Only members with recorded attendance can add interview comments."}
      </p>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : loading ? (
        <p className="text-sm">Loading attendance…</p>
      ) : (
        <ul className="space-y-2">
          {users
            .filter((u) => members.includes(u.id) || attendees.includes(u.id))
            .map((u) => (
              <li key={u.id}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={attendees.includes(u.id)}
                    disabled={!manage || busy || (!completed && !attendees.includes(u.id))}
                    onCheckedChange={(value) => void toggle(u.id, value === true)}
                  />
                  {u.firstName} {u.lastName}
                </label>
              </li>
            ))}
        </ul>
      )}
      {!loading && !members.length && (
        <p className="text-muted-foreground text-sm">No position group members assigned yet.</p>
      )}
    </section>
  );
}
