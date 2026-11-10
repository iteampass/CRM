import { APP_SCHEMA } from "@/integrations/supabase/schema";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, type OpenRequest, type WorkspaceData } from "@/lib/handyflow.functions";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: number;
  taskId: string;
}

/**
 * Derives in-app notifications by diffing successive workspace snapshots.
 * - Handymen: a request id that appears for the first time = new task in their country
 *   (the server already scopes open requests to the handyman's country).
 * - Clients: a status change on one of their own requests.
 */
export function useTaskNotifications(data: WorkspaceData) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const previous = useRef<Map<string, string> | null>(null);
  const queryClient = useQueryClient();
  const role = data.viewer.role;

  const all = useMemo<OpenRequest[]>(
    () => [...data.openRequests, ...data.archivedRequests],
    [data.openRequests, data.archivedRequests],
  );

  // Stored notifications (e.g. "a client asked you to take a request").
  useEffect(() => {
    let active = true
    async function load() {
      const { data: user } = await supabase.auth.getUser()
      const uid = user.user?.id
      if (!uid) return
      const { data: rows } = await supabase
        .from("notifications")
        .select("id, title, body, task_id, read, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20)
      if (!active || !rows) return
      setItems((prev) => {
        const known = new Set(prev.map((n) => n.id))
        const mapped = rows
          .filter((r) => !known.has(r.id))
          .map((r) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            at: new Date(r.created_at).getTime(),
            taskId: r.task_id ?? "",
          }))
        return [...mapped, ...prev].sort((a, b) => b.at - a.at).slice(0, 20)
      })
      setUnread((u) => u + rows.filter((r) => !r.read).length)

      const channel = supabase
        .channel(`notifications-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: APP_SCHEMA, table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            const r = payload.new as {
              id: string
              title: string
              body: string
              task_id: string | null
              created_at: string
            }
            const n: AppNotification = {
              id: r.id,
              title: r.title,
              body: r.body,
              at: new Date(r.created_at).getTime(),
              taskId: r.task_id ?? "",
            }
            setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 20)))
            setUnread((u) => u + 1)
            toast(n.title, { description: n.body })
          },
        )
        .subscribe()
      cleanup = () => {
        void supabase.removeChannel(channel)
      }
    }
    let cleanup: (() => void) | undefined
    void load()
    return () => {
      active = false
      cleanup?.()
    }
  }, [])

  // Refresh the workspace whenever tasks change in the database.
  useEffect(() => {
    const channel = supabase
      .channel("task-notifications")
      .on("postgres_changes", { event: "*", schema: APP_SCHEMA, table: "task_requests" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["workspace"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    const snapshot = new Map(all.map((r) => [r.id, r.status]));
    const before = previous.current;
    previous.current = snapshot;
    if (!before) return; // first load only establishes a baseline

    const fresh: AppNotification[] = [];
    const now = Date.now();
    for (const r of all) {
      const prevStatus = before.get(r.id);
      if (prevStatus === undefined) {
        if (role === "handyman") {
          fresh.push({
            id: `new-${r.id}-${now}`,
            title: "New request in your area",
            body: `${r.title} — ${r.client}, ${r.location}`,
            at: now,
            taskId: r.id,
          });
        }
      } else if (prevStatus !== r.status && role === "client") {
        fresh.push({
          id: `status-${r.id}-${now}`,
          title: `Request updated: ${r.title}`,
          body: `${STATUS_LABELS[prevStatus] ?? prevStatus} → ${STATUS_LABELS[r.status] ?? r.status}`,
          at: now,
          taskId: r.id,
        });
      }
    }

    if (fresh.length) {
      setItems((p) => [...fresh, ...p].slice(0, 20));
      setUnread((u) => u + fresh.length);
      for (const n of fresh) toast(n.title, { description: n.body });
    }
  }, [all, role]);

  return {
    items,
    unread,
    markRead: () => {
      setUnread(0);
      void supabase.auth.getUser().then(({ data }) => {
        const uid = data.user?.id;
        if (uid) void supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
      });
    },
    clearAll: () => {
      setItems([]);
      setUnread(0);
      void supabase.auth.getUser().then(({ data }) => {
        const uid = data.user?.id;
        if (uid) void supabase.from("notifications").delete().eq("user_id", uid);
      });
    },
  };
}
