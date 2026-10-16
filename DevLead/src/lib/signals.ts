import { useCallback, useEffect, useState } from "react";
import { db, workspace, loadCrm } from "@/lib/mock-data";

export const SIGNAL_TYPES = ["hiring", "funding", "product_launch", "leadership_change", "tech_stack_change", "news_mention", "expansion", "other"] as const;
export const SIGNAL_STRENGTHS = ["low", "medium", "high"] as const;
export const SIGNAL_STATUSES = ["new", "reviewed", "actioned", "dismissed"] as const;
export const SIGNAL_SOURCES = ["manual", "imported", "automated"] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];
export type SignalStrength = (typeof SIGNAL_STRENGTHS)[number];
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

export interface SignalRow {
  id: string; company_id: string; lead_id: string | null; type: SignalType; title: string; description: string | null;
  source_url: string | null; source: (typeof SIGNAL_SOURCES)[number]; strength: SignalStrength; detected_at: string; status: SignalStatus;
  created_at: string; company?: { name: string } | null;
}
export type SignalInput = Pick<SignalRow, "company_id" | "lead_id" | "type" | "title" | "description" | "source_url" | "strength" | "detected_at">;

export const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

const SELECT = "*, company:companies(name)";
// Refresh the shared CRM store (lead badges, lead pages) after any change.
const refresh = () => loadCrm(true).catch(() => undefined);

export async function listSignals(companyId?: string): Promise<SignalRow[]> {
  await loadCrm();
  let q = db().from("signals").select(SELECT).eq("workspace_id", workspace.id).order("detected_at", { ascending: false }).limit(1000);
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) throw error;
  return data as SignalRow[];
}
export async function createSignal(v: SignalInput) {
  const { error } = await db().from("signals").insert({ ...v, workspace_id: workspace.id, source: "manual" });
  if (error) throw error;
  await refresh();
}
export async function updateSignal(id: string, v: Partial<SignalInput> & { status?: SignalStatus }) {
  const { error } = await db().from("signals").update(v).eq("id", id);
  if (error) throw error;
  await refresh();
}
export async function deleteSignal(id: string) {
  const { error } = await db().from("signals").delete().eq("id", id);
  if (error) throw error;
  await refresh();
}
export async function createFollowUpTask(s: SignalRow) {
  const due = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  const { error } = await db().from("tasks").insert({ workspace_id: workspace.id, company_id: s.company_id, title: `Follow up: ${s.title}`.slice(0, 200), due_date: due, priority: s.strength === "high" ? "High" : "Medium" });
  if (error) throw error;
  await refresh();
}

export function useSignals(companyId?: string) {
  const [rows, setRows] = useState<SignalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    listSignals(companyId).then((r) => { setRows(r); setError(null); }).catch((e) => setError(e.message ?? "Could not load signals"));
  }, [companyId]);
  useEffect(reload, [reload]);
  return { rows, error, reload };
}
