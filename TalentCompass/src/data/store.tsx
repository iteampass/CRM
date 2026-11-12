/**
 * Data access layer - backed by Supabase.
 *
 * Every read and write goes through this provider; UI components keep using
 * the same hook API they used with the previous mock implementation.
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
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";
import { parseCandidateResume } from "@/lib/resume-parser.functions";
import {
  averageScore,
  type Candidate,
  type CandidateStatus,
  type Comment,
  type CommentStage,
  type Interview,
  type InterviewStatus,
  type ParsedResume,
  type Position,
  type PositionStatus,
  type User,
} from "@/lib/types";

interface RecruitmentContextValue {
  loading: boolean;
  currentUser: User;
  users: User[];
  candidates: Candidate[];
  positions: Position[];
  interviews: Interview[];
  comments: Comment[];
  getUser: (id: string) => User | undefined;
  getPosition: (id: string) => Position | undefined;
  getCandidate: (id: string) => Candidate | undefined;
  getInterview: (id: string) => Interview | undefined;
  interviewsFor: (candidateId: string) => Interview[];
  commentsFor: (candidateId: string) => Comment[];
  scoreFor: (candidateId: string) => number | null;
  setCandidateStatus: (candidateId: string, status: CandidateStatus) => Promise<void>;
  addComment: (input: { candidateId: string; content: string; stage: CommentStage; interviewId?: string }) => Promise<void>;
  addInterview: (input: {
    candidateId: string;
    interviewerId: string;
    interviewType: string;
    score: number | null;
    comments: string;
    interviewDate: string;
    durationMinutes?: number;
    meetingLink?: string;
  }) => Promise<void>;
  updateInterview: (
    interviewId: string,
    fields: Partial<{
      interviewType: string;
      interviewerId: string;
      interviewDate: string;
      durationMinutes: number;
      meetingLink: string;
      comments: string;
      score: number | null;
      status: InterviewStatus;
    }>,
  ) => Promise<void>;
  updateInterviewScore: (interviewId: string, score: number) => Promise<void>;
  deleteInterview: (interviewId: string) => Promise<void>;
  addPosition: (input: { name: string; department: string; description: string; status: PositionStatus }) => Promise<void>;
  updatePosition: (
    positionId: string,
    fields: Partial<{
      name: string;
      department: string;
      description: string;
      status: PositionStatus;
      accessRestricted: boolean;
    }>,
  ) => Promise<void>;
  deletePosition: (positionId: string) => Promise<void>;
  addCandidate: (input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    positionId: string;
    status: CandidateStatus;
  }) => Promise<void>;
  uploadResume: (candidateId: string, file: File) => Promise<void>;
  parseResume: (candidateId: string) => Promise<Candidate | null>;
  createCandidateFromResume: (options?: { draft?: boolean }) => Promise<string>;
  updateCandidate: (
    candidateId: string,
    fields: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      positionId: string | null;
      status: CandidateStatus;
    }>,
    options?: { publish?: boolean },
  ) => Promise<void>;
  deleteCandidate: (candidateId: string) => Promise<void>;
}

const RecruitmentContext = createContext<RecruitmentContextValue | null>(null);

const EMPTY_USER: User = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  companyPosition: "",
  createdAt: new Date().toISOString(),
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const toUser = (r: any): User => ({
  id: r.id,
  firstName: r.first_name ?? "",
  lastName: r.last_name ?? "",
  email: r.email ?? "",
  phone: r.phone ?? "",
  companyPosition: r.company_position ?? "",
  createdAt: r.created_at,
});

const toPosition = (r: any): Position => ({
  id: r.id,
  name: r.name,
  department: r.department ?? "",
  description: r.description ?? "",
  status: r.status,
  accessRestricted: r.access_restricted ?? false,
  createdAt: r.created_at,
});

const toCandidate = (r: any): Candidate => ({
  createdBy: r.created_by,
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  phone: r.phone ?? "",
  resumeUrl: r.resume_url,
  resumeMeta: r.resume_meta as Candidate["resumeMeta"],
  resumeText: r.resume_text,
  parsedResumeData: (r.parsed_resume_data as ParsedResume | null) ?? null,
  status: r.status,
  positionId: r.position_id ?? "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toInterview = (r: any): Interview => ({
  id: r.id,
  candidateId: r.candidate_id,
  interviewerId: r.interviewer_id ?? "",
  interviewType: r.interview_type ?? "",
  score: r.score === null || r.score === undefined ? null : Number(r.score),
  comments: r.comments ?? "",
  criteria: (r.criteria as Interview["criteria"]) ?? [],
  status: r.status,
  interviewDate: r.interview_date,
  durationMinutes: r.duration_minutes ?? 60,
  meetingLink: r.meeting_link ?? "",
  createdAt: r.created_at,
});

const toComment = (r: any): Comment => ({
  interviewId: r.interview_id ?? null,
  id: r.id,
  candidateId: r.candidate_id,
  authorId: r.author_id ?? "",
  content: r.content,
  stage: r.stage,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export function RecruitmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { accessVersion } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  const refresh = useCallback(async () => {
    const [p, pos, c, i, cm] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("positions").select("*").order("created_at"),
      supabase.from("candidates").select("*").order("created_at"),
      supabase.from("interviews").select("*").order("interview_date"),
      supabase.from("candidate_comments").select("*").order("created_at"),
    ]);
    setUsers((p.data ?? []).map(toUser));
    setPositions((pos.data ?? []).map(toPosition));
    setCandidates((c.data ?? []).map(toCandidate));
    setInterviews((i.data ?? []).map(toInterview));
    setComments((cm.data ?? []).map(toComment));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.id, accessVersion]);

  const setCandidateStatus = useCallback(
    async (candidateId: string, status: CandidateStatus) => {
      const { data, error } = await supabase
        .from("candidates")
        .update({ status })
        .eq("id", candidateId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Could not update candidate status");
      const updated = toCandidate(data);
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? updated : c)));
    },
    [],
  );

  const addComment: RecruitmentContextValue["addComment"] = useCallback(
    (input) => {
      return (async () => {
        const { data, error } = await supabase
          .from("candidate_comments")
          .insert({
            candidate_id: input.candidateId,
            author_id: user?.id ?? null,
            content: input.content,
            stage: input.stage,
            interview_id: input.interviewId ?? null,
          })
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Could not add comment");
        setComments((prev) => [...prev, toComment(data)]);
      })();
    },
    [user?.id],
  );

  const addInterview: RecruitmentContextValue["addInterview"] = useCallback((input) => {
    return (async () => {
      const { data, error } = await supabase
        .from("interviews")
        .insert({
          candidate_id: input.candidateId,
          interviewer_id: input.interviewerId || null,
          interview_type: input.interviewType,
          score: input.score,
          comments: input.comments,
          criteria: [],
          status: input.score === null ? "scheduled" : "completed",
          interview_date: input.interviewDate,
          duration_minutes: input.durationMinutes ?? 60,
          meeting_link: input.meetingLink?.trim() ?? "",
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Could not add interview");
      setInterviews((prev) => [...prev, toInterview(data)]);
    })();
  }, []);

  const updateInterviewScore = useCallback(async (interviewId: string, score: number) => {
    const { data, error } = await supabase
      .from("interviews")
      .update({ score, status: "completed" })
      .eq("id", interviewId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Could not update interview score");
    const updated = toInterview(data);
    setInterviews((prev) => prev.map((i) => (i.id === interviewId ? updated : i)));
  }, []);

  const updateInterview: RecruitmentContextValue["updateInterview"] = useCallback(
    async (interviewId, fields) => {
      const { data, error } = await supabase
        .from("interviews")
        .update({
          ...(fields.interviewType !== undefined ? { interview_type: fields.interviewType } : {}),
          ...(fields.interviewerId !== undefined ? { interviewer_id: fields.interviewerId || null } : {}),
          ...(fields.interviewDate !== undefined ? { interview_date: fields.interviewDate } : {}),
          ...(fields.durationMinutes !== undefined ? { duration_minutes: fields.durationMinutes } : {}),
          ...(fields.meetingLink !== undefined ? { meeting_link: fields.meetingLink.trim() } : {}),
          ...(fields.comments !== undefined ? { comments: fields.comments } : {}),
          ...(fields.score !== undefined ? { score: fields.score } : {}),
          ...(fields.status !== undefined ? { status: fields.status } : {}),

        })
        .eq("id", interviewId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return;
      const updated = toInterview(data);
      setInterviews((prev) => prev.map((i) => (i.id === interviewId ? updated : i)));
    },
    [],
  );

  const deleteInterview = useCallback(async (interviewId: string) => {
    const { error } = await supabase.from("interviews").delete().eq("id", interviewId);
    if (error) throw error;
    setInterviews((prev) => prev.filter((i) => i.id !== interviewId));
  }, []);

  const addPosition: RecruitmentContextValue["addPosition"] = useCallback((input) => {
    return (async () => {
      // Use a client-generated ID and fetch in a separate request. PostgREST can
      // reject an INSERT ... RETURNING response when a newly added RLS policy
      // evaluates the row, despite allowing both the insert and a later select.
      const id = crypto.randomUUID();
      const { error } = await supabase
        .from("positions")
        .insert({
          id,
          name: input.name,
          department: input.department,
          description: input.description,
          status: input.status,
        });
      if (error) throw error;

      const { data, error: selectError } = await supabase
        .from("positions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (selectError) throw selectError;
      if (!data) throw new Error("Could not add position");
      setPositions((prev) => [...prev, toPosition(data)]);
    })();
  }, []);

  const addCandidate: RecruitmentContextValue["addCandidate"] = useCallback((input) => {
    return (async () => {
      const { data, error } = await supabase
        .from("candidates")
        .insert({
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          phone: input.phone,
          position_id: input.positionId || null,
          status: input.status,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Could not add candidate");
      setCandidates((prev) => [...prev, toCandidate(data)]);
    })();
  }, []);

  const uploadResume = useCallback(async (candidateId: string, file: File) => {
    const path = `${candidateId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, file, { upsert: true, ...(file.type ? { contentType: file.type } : {}) });
    if (uploadError) throw uploadError;

    const isText = file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name);
    const resumeText = isText ? await file.text() : null;

    const resumeMeta = {
      fileName: file.name,
      sizeKb: Math.round((file.size / 1024) * 100) / 100,
      pages: 1,
    };

    const { data, error } = await supabase
      .from("candidates")
      .update({
        resume_url: path,
        resume_meta: resumeMeta,
        ...(resumeText ? { resume_text: resumeText } : {}),
      })
      .eq("id", candidateId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const updated = toCandidate(data);
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? updated : c)));
    }
  }, []);

  const parseResume = useCallback(async (candidateId: string) => {
    const parsed = await parseCandidateResume({ data: { candidateId } });
    const { data: row } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .maybeSingle();
    const updated = row ? toCandidate(row) : null;
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? (updated ?? {
              ...c,
              parsedResumeData: parsed as ParsedResume,
              updatedAt: new Date().toISOString(),
            })
          : c,
      ),
    );
    return updated;
  }, []);

  /** Create an empty candidate record so a resume can be uploaded without picking one. */
  const createCandidateFromResume = useCallback(async (options?: { draft?: boolean }) => {
    const { data, error } = await supabase
      .from("candidates")
      .insert({ first_name: "", last_name: "", email: "", phone: "", status: "new" })
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Could not create the candidate record");
    if (!options?.draft) setCandidates((prev) => [...prev, toCandidate(data)]);
    return data.id as string;
  }, []);

  const updateCandidate: RecruitmentContextValue["updateCandidate"] = useCallback(
    async (candidateId, fields, options) => {
      const { data, error } = await supabase
        .from("candidates")
        .update({
          ...(fields.firstName !== undefined ? { first_name: fields.firstName } : {}),
          ...(fields.lastName !== undefined ? { last_name: fields.lastName } : {}),
          ...(fields.email !== undefined ? { email: fields.email } : {}),
          ...(fields.phone !== undefined ? { phone: fields.phone } : {}),
          ...(fields.positionId !== undefined ? { position_id: fields.positionId || null } : {}),
          ...(fields.status !== undefined ? { status: fields.status } : {}),
        })
        .eq("id", candidateId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return;
      const updated = toCandidate(data);
      setCandidates((prev) =>
        prev.some((c) => c.id === candidateId)
          ? prev.map((c) => (c.id === candidateId ? updated : c))
          : options?.publish
            ? [...prev, updated]
            : prev,
      );
    },
    [],
  );

  const deleteCandidate = useCallback(async (candidateId: string) => {
    const { error } = await supabase.from("candidates").delete().eq("id", candidateId);
    if (error) throw error;
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
  }, []);

  const updatePosition: RecruitmentContextValue["updatePosition"] = useCallback(
    async (positionId, fields) => {
      const { data, error } = await supabase
        .from("positions")
        .update({
          ...(fields.name !== undefined ? { name: fields.name } : {}),
          ...(fields.department !== undefined ? { department: fields.department } : {}),
          ...(fields.description !== undefined ? { description: fields.description } : {}),
          ...(fields.status !== undefined ? { status: fields.status } : {}),
        })
        .eq("id", positionId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return;
      const updated = toPosition(data);
      setPositions((prev) => prev.map((p) => (p.id === positionId ? updated : p)));
    },
    [],
  );

  const deletePosition = useCallback(async (positionId: string) => {
    const { error } = await supabase.from("positions").delete().eq("id", positionId);
    if (error) throw error;
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    setCandidates((prev) =>
      prev.map((c) => (c.positionId === positionId ? { ...c, positionId: "" } : c)),
    );
  }, []);

  const value = useMemo<RecruitmentContextValue>(() => {
    const interviewsByCandidate = new Map<string, Interview[]>();
    for (const i of interviews) {
      const list = interviewsByCandidate.get(i.candidateId) ?? [];
      list.push(i);
      interviewsByCandidate.set(i.candidateId, list);
    }

    const sortedFor = (id: string) =>
      [...(interviewsByCandidate.get(id) ?? [])].sort(
        (a, b) => +new Date(a.interviewDate) - +new Date(b.interviewDate),
      );

    return {
      loading,
      currentUser: user ?? users[0] ?? EMPTY_USER,
      users,
      candidates,
      positions,
      interviews,
      comments,
      getUser: (id) => users.find((u) => u.id === id),
      getPosition: (id) => positions.find((p) => p.id === id),
      getCandidate: (id) => candidates.find((c) => c.id === id),
      getInterview: (id) => interviews.find((i) => i.id === id),
      interviewsFor: sortedFor,
      commentsFor: (candidateId) =>
        comments
          .filter((c) => c.candidateId === candidateId)
          .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
      scoreFor: (candidateId) => averageScore(interviewsByCandidate.get(candidateId) ?? []),
      setCandidateStatus,
      addComment,
      addInterview,
      updateInterview,
      updateInterviewScore,
      deleteInterview,
      addPosition,
      updatePosition,
      deletePosition,
      addCandidate,
      uploadResume,
      parseResume,
      createCandidateFromResume,
      updateCandidate,
      deleteCandidate,
    };
  }, [
    loading,
    user,
    users,
    candidates,
    positions,
    interviews,
    comments,
    setCandidateStatus,
    addComment,
    addInterview,
    updateInterview,
    updateInterviewScore,
    deleteInterview,
    addPosition,
    updatePosition,
    deletePosition,
    addCandidate,
    uploadResume,
    parseResume,
    createCandidateFromResume,
    updateCandidate,
    deleteCandidate,
  ]);

  return <RecruitmentContext.Provider value={value}>{children}</RecruitmentContext.Provider>;
}

export function useRecruitment() {
  const ctx = useContext(RecruitmentContext);
  if (!ctx) throw new Error("useRecruitment must be used inside RecruitmentProvider");
  return ctx;
}
