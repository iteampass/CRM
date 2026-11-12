// Domain types. These mirror the future database schema so the mock data layer
// can be swapped for real queries without touching UI components.

export type CandidateStatus =
  | "new"
  | "screening"
  | "interview"
  | "technical"
  | "final"
  | "offer"
  | "hired"
  | "rejected";

export type CommentStage = "recruiter" | "hr" | "technical" | "final";

export type InterviewStatus = "scheduled" | "completed" | "cancelled";

export type PositionStatus = "open" | "paused" | "closed";

export interface User {
  avatarUrl?: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyPosition: string;
  createdAt: string;
}

export interface ParsedResume {
  summary: string;
  yearsOfExperience: number;
  location: string;
  links: { label: string; url: string }[];
  experience: {
    company: string;
    role: string;
    period: string;
    description: string;
  }[];
  education: { school: string; degree: string; period: string }[];
  skills: string[];
  certifications: string[];
  languages: { name: string; level: string }[];
}

export interface Candidate {
  createdBy?: string | null;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeUrl: string | null;
  resumeMeta: { fileName: string; sizeKb: number; pages: number } | null;
  resumeText: string | null;
  parsedResumeData: ParsedResume | null;
  status: CandidateStatus;
  positionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  interviewerId: string;
  interviewType: string;
  score: number | null;
  comments: string;
  criteria: { label: string; score: number }[];
  status: InterviewStatus;
  interviewDate: string;
  durationMinutes: number;
  meetingLink: string;
  createdAt: string;
}

/** Allowed interview durations, 30 minutes up to 2 hours. */
export const DURATION_OPTIONS = [30, 60, 90, 120];

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export interface Position {
  id: string;
  name: string;
  department: string;
  description: string;
  status: PositionStatus;
  accessRestricted: boolean;
  createdAt: string;
}

export interface Comment {
  interviewId?: string | null;
  id: string;
  candidateId: string;
  authorId: string;
  content: string;
  stage: CommentStage;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_ORDER: CandidateStatus[] = [
  "new",
  "screening",
  "interview",
  "technical",
  "final",
  "offer",
  "hired",
  "rejected",
];

export const STATUS_LABEL: Record<CandidateStatus, string> = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  technical: "Technical Interview",
  final: "Final Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export const STAGE_LABEL: Record<CommentStage, string> = {
  recruiter: "Recruiter feedback",
  hr: "HR feedback",
  technical: "Technical feedback",
  final: "Final interview feedback",
};

/** Average interview score - always derived, never stored. */
export function averageScore(interviews: Interview[]): number | null {
  const scores = interviews
    .map((i) => i.score)
    .filter((s): s is number => typeof s === "number");
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
