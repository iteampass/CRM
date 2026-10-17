import { useI18n } from "@/lib/i18n";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building2,
  CheckSquare,
  Columns3,
  Database,
  LayoutDashboard,
  Radar,
  Search,
  Send,
  Settings,
  Bookmark,
  Users,
  Zap,
  ChevronsUpDown,
  Globe,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { companies, contacts, leadForCompany, workspace } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useProfile } from "@/lib/profile";
const groups = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Leads", url: "/leads", icon: Zap },
      { title: "Companies", url: "/companies", icon: Building2 },
      { title: "Contacts", url: "/contacts", icon: Users },
      { title: "Signals", url: "/signals", icon: Radar },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Pipeline", url: "/pipeline", icon: Columns3 },
      { title: "Tasks", url: "/tasks", icon: CheckSquare },
      { title: "Outreach", url: "/outreach", icon: Send },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Saved Searches", url: "/saved-searches", icon: Bookmark },
      { title: "Lead Sources", url: "/lead-sources", icon: Database },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Website", url: "/website", icon: Globe },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
] as const;
function AppSidebar() {
  const { t: ui } = useI18n();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const active = (u: string) => (u === "/" ? path === "/" : path.startsWith(u));
  const nav = useNavigate();
  const qc = useQueryClient();
  const profile = useProfile();
  const fullName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
  const displayName = fullName || profile?.email || "";
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            {ui("D")}
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-accent-foreground">
              {ui("DevLead")}
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase tracking-wider text-[10px]">
              {ui(g.label)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton asChild isActive={active(it.url)} tooltip={ui(it.title)}>
                      <Link to={it.url}>
                        <it.icon className="h-4 w-4" />
                        <span>{ui(it.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-3 p-3">
        {!collapsed && (
          <>
            <div className="rounded-lg bg-sidebar-accent p-3 text-xs">
              <div className="flex justify-between text-sidebar-accent-foreground">
                <span className="font-semibold">{ui("Pro plan")}</span>
                <span>412 / 1,000</span>
              </div>
              <p className="mb-2 text-sidebar-foreground/70">{ui("Lead enrichments this month")}</p>
              <Progress value={41} className="h-1.5 bg-sidebar-border" />
            </div>
            <button className="flex items-center justify-between rounded-lg border border-sidebar-border px-3 py-2 text-left text-xs">
              <div>
                <p className="text-sidebar-foreground/60">{ui("Workspace")}</p>
                <p className="font-semibold text-sidebar-accent-foreground">
                  {workspace.name || "Workspace"}
                </p>
              </div>
              <ChevronsUpDown className="h-4 w-4" />
            </button>
          </>
        )}
        <div className="flex items-center gap-2">
          <Link to="/settings" className="flex min-w-0 flex-1 items-center gap-2">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={ui("")}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold uppercase text-sidebar-primary-foreground">
                {displayName.slice(0, 2)}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 text-xs">
                <p className="truncate font-semibold text-sidebar-accent-foreground">
                  {displayName}
                </p>
                <p className="capitalize text-sidebar-foreground/60">{ui(workspace.role)}</p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={signOut}
              aria-label={ui("Sign out")}
              title={ui("Sign out")}
              className="rounded-md p-1.5 hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
function GlobalSearch() {
  const { t: ui } = useI18n();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const t = q.trim().toLowerCase();
  const hits =
    t.length < 2
      ? []
      : [
          ...companies
            .filter((c) =>
              [c.name, c.domain, ...c.technologies, ...c.signals.map((s) => s.description)]
                .join(" ")
                .toLowerCase()
                .includes(t),
            )
            .slice(0, 5)
            .map((c) => ({ id: c.id, label: c.name, sub: `${c.industry} · ${c.domain}` })),
          ...contacts
            .filter((p) => `${p.firstName} ${p.lastName} ${p.title}`.toLowerCase().includes(t))
            .slice(0, 4)
            .filter((p) => leadForCompany(p.companyId))
            .map((p) => ({
              id: leadForCompany(p.companyId)!.id,
              label: `${p.firstName} ${p.lastName}`,
              sub: p.title,
            })),
        ];
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={ui("Search companies, people, tech, signals\u2026")}
        className="h-9 bg-muted pl-9 border-transparent"
      />
      {hits.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
          {hits.map((h, i) => (
            <button
              key={i}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setQ("");
                navigate({ to: "/leads/$id", params: { id: h.id } });
              }}
            >
              <span className="font-medium">{ui(h.label)}</span>{" "}
              <span className="text-xs text-muted-foreground">{h.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const { t: ui } = useI18n();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4">
            <SidebarTrigger />
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-3">
              <button
                className="relative rounded-md p-2 hover:bg-muted"
                aria-label={ui("Notifications")}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-highlight" />
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
