import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ProfileDialog } from "@/components/app/profile-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRecruitment } from "@/data/store";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/candidates", label: "Candidates", icon: Users, exact: false, countKey: "candidates" },
  { to: "/app/resumes", label: "Resumes", icon: FileText, exact: false, countKey: "resumes" },
  { to: "/app/positions", label: "Positions", icon: Briefcase, exact: false, countKey: "positions" },
  { to: "/app/positions/archived", label: "Archived positions", icon: Archive, exact: true },
  { to: "/app/interviews", label: "Interviews", icon: ClipboardList, exact: false },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays, exact: false },
] as const;

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="bg-accent text-accent-foreground grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold">
      {initials}
    </span>
  );
}

function SidebarBody({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { candidates, positions, interviews } = useRecruitment();
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const { workspaceName, isAdmin } = useWorkspace();
  const navigate = useNavigate();

  const recent = candidates.slice(0, 3);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = {
    candidates: candidates.length,
    resumes: candidates.filter((candidate) => candidate.resumeUrl || candidate.resumeText).length,
    positions: positions.filter((position) => position.status !== "closed").length,
    archived: positions.filter((position) => position.status === "closed").length,
    interviews: interviews.length,
    calendar: interviews.filter(
      (interview) =>
        interview.status !== "cancelled" && new Date(interview.interviewDate) >= today,
    ).length,
  };

  return (
    <div className="flex h-full flex-col gap-7 p-4">
      <Link to="/" className={cn("flex items-center gap-3 px-2 pt-2", compact && "justify-center px-0")}>
        <span className="bg-sidebar-primary text-sidebar-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg">
          <Map className="size-4" />
        </span>
        {!compact ? (
          <span className="min-w-0">
            <span className="font-display text-sidebar-foreground block text-[15px] font-semibold">Talent Compass</span>
            {workspaceName ? (
              <span className="text-sidebar-foreground/60 block text-xs">Workspace {workspaceName}</span>
            ) : null}
          </span>
        ) : null}
      </Link>

      <div className="space-y-1">
        {!compact ? (
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase text-sidebar-foreground/50">
            Workspace {workspaceName}
          </p>
        ) : null}
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname.startsWith(item.to) && !pathname.startsWith("/app/positions/archived");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors duration-150",
                compact && "justify-center px-0",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--color-brand-accent)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {!compact ? item.label : null}
              {!compact && "countKey" in item ? (
                <span className="ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 text-[11px] tabular-nums text-black">
                  {counts[item.countKey]}
                </span>
              ) : null}
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            to="/app/workspace"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors duration-150",
              compact && "justify-center px-0",
              pathname.startsWith("/app/workspace")
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--color-brand-accent)]"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Settings className="size-4" />
            {!compact ? "Workspace admin" : null}
          </Link>
        ) : null}
      </div>

      {!compact ? <div className="space-y-1">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase text-sidebar-foreground/50">Recent</p>
        {recent.map((c) => (
          <Link
            key={c.id}
            to="/app/candidates/$candidateId"
            params={{ candidateId: c.id }}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <span className="border-border-strong size-4 rounded-full border" />
            <span className="truncate">
              {c.firstName} {c.lastName}
            </span>
          </Link>
        ))}
      </div> : null}

      <div className="mt-auto space-y-1">
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Open profile menu" className="focus-visible:ring-2 focus-visible:ring-sidebar-ring hover:bg-sidebar-accent/60 flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors outline-none">
             {user?.avatarUrl ? <img src={user.avatarUrl} alt="Your profile" className="size-8 shrink-0 rounded-lg object-cover" /> : <Initials name={`${user?.firstName ?? "A"} ${user?.lastName ?? "N"}`} />}
             {!compact ? <>
             <span className="min-w-0 flex-1">
              <span className="text-sidebar-foreground block truncate text-sm font-medium">
                {user ? `${user.firstName} ${user.lastName}` : "Signed out"}
              </span>
              <span className="block truncate text-xs text-sidebar-foreground/55">
                {user?.companyPosition ?? "-"}
              </span>
            </span>
             <ChevronDown className="size-4 text-sidebar-foreground/60" />
             </> : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setProfileOpen(true)}><Settings className="size-4" />Change profile</DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative size-9 overflow-hidden text-foreground"
    >
      <Sun
        className={cn(
          "size-4 transition-all duration-300",
          theme === "dark" ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute size-4 transition-all duration-300",
          theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
        )}
      />
    </Button>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-background app-enter flex min-h-screen">
      <aside className={cn("bg-sidebar text-sidebar-foreground border-sidebar-border hidden shrink-0 border-r transition-[width] duration-200 lg:block", collapsed ? "w-16" : "w-64")}>
        <div className="sticky top-0 h-screen">
          <SidebarBody compact={collapsed} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="bg-foreground/25 absolute inset-0 animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="bg-sidebar border-sidebar-border absolute inset-y-0 left-0 w-72 border-r duration-200 animate-in slide-in-from-left">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </Button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-surface/95 border-border sticky top-0 z-30 border-b backdrop-blur-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
                <Menu className="size-4" />
              </Button>
              <div className="min-w-0">
                 <h1 className="truncate text-lg font-semibold sm:text-xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="text-muted-foreground mt-0.5 max-w-full break-words text-xs sm:text-sm">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
