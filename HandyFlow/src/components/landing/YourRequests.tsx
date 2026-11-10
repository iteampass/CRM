import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const statuses: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "bg-warning-soft text-warning" },
  negotiating: { label: "Reviewing offers", tone: "bg-info-soft text-info" },
  agreed: { label: "Agreed", tone: "bg-success-soft text-success" },
  in_progress: { label: "In progress", tone: "bg-info-soft text-info" },
  completed: { label: "Completed", tone: "bg-neutralish-soft text-neutralish" },
  cancelled: { label: "Cancelled", tone: "bg-neutralish-soft text-neutralish" },
};

export function YourRequests() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    // INITIAL_SESSION restores the remembered Supabase session. Never cache
    // private request content in cookies or display it after sign-out.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const {
    data: requests,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["landing-requests", userId],
    enabled: Boolean(userId),
    gcTime: 0,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("task_requests")
        .select("id, title, status")
        .eq("client_id", userId)
        .order("updated_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (userId && isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading your requests…
      </p>
    );
  }

  if (userId && !isError && requests?.length) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your requests
        </p>
        <div className="mt-4 space-y-3">
          {requests.map((request) => {
            const status = statuses[request.status] ?? {
              label: request.status,
              tone: "bg-muted text-muted-foreground",
            };
            return (
              <Link
                key={request.id}
                to="/dashboard"
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {request.title}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}
                >
                  {status.label}
                </span>
              </Link>
            );
          })}
        </div>
        <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-brand">
          View all your requests →
        </Link>
      </div>
    );
  }

  return (
    <div>
      {userId && isError && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Your requests couldn’t be loaded right now.
        </p>
      )}
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">
        Small jobs deserve a helping hand
      </p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
        A small repair shouldn’t be a big challenge.
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Big renovations often get the attention. But what if you just need an outdoor pipe replaced,
        a shelf fixed to the wall, or a small leak sorted out? Finding someone for a little job can
        be surprisingly difficult.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        HandyFlow helps you find a handyman in your neighbourhood who’s happy to help with the
        everyday repairs. Post what you need, connect with someone nearby, and get that small job
        off your list.
      </p>
      {userId ? (
        <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-brand">
          Go to your workspace →
        </Link>
      ) : (
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="mt-4 inline-block text-sm font-semibold text-brand"
        >
          Find help nearby →
        </Link>
      )}
    </div>
  );
}
