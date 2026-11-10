export function arrivalProposalMode(status: string, acceptedDate: string | null, time: string | null) {
  if (status === "completed" || status === "cancelled") return "closed";
  if (!acceptedDate || !time) return "initial";
  return status === "agreed" || status === "in_progress" ? "postpone" : "waiting";
}
