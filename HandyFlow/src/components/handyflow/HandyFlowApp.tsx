import { useI18n } from "@/lib/i18n";
import { GetProDialog } from "./GetProDialog";
import { FlagImg } from "@/components/CountrySelect";
import { COUNTRIES } from "@/lib/countries";
import { RequestActivityLog } from "./RequestActivityLog";
import { IncomeView } from "./IncomeView";
import { Link } from "@tanstack/react-router";
import { RequestArrivalCalendar } from "./RequestArrivalCalendar";
import { ClientContact } from "./ClientContact";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ProfileDialog, ProfileForm } from "@/components/handyflow/ProfileDialog";
import { RequestDialog } from "@/components/handyflow/RequestDialog";
import { TakeRequestDialog } from "@/components/handyflow/TakeRequestDialog";
import { InviteDialog } from "@/components/handyflow/InviteDialog";
import { SupportDialog } from "@/components/handyflow/SupportDialog";
import { ShareTestimonialPanel, TestimonialAdminPanel } from "@/components/handyflow/TestimonialsPanel";
import {
  Archive,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Filter,
  Hammer,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { HandymanEntry, OpenRequest, Tone, WorkspaceData } from "@/lib/handyflow.functions";
import { STATUS_LABELS, submitReview } from "@/lib/handyflow.functions";
import { geocodeAddress, mapEmbedUrl } from "@/lib/geocode";
import { useTaskNotifications, type AppNotification } from "@/lib/use-task-notifications";

const DataContext = createContext<WorkspaceData | null>(null);
const useData = () => useContext(DataContext)!;

const UIContext = createContext<{ openHandyman: (id: string) => void }>({ openHandyman: () => {} });
const useUI = () => useContext(UIContext);

const statMeta = [
  ["Active requests", "Needs attention", ClipboardList, "blue"],
  ["Available handymen", "Ready for work", Users, "green"],
  ["Active projects", "Currently underway", BriefcaseBusiness, "violet"],
  ["Completed projects", "This year", CheckCircle2, "amber"],
] as const;

function Badge({ children, tone = "blue" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`status-badge status-${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
function Avatar({
  initials,
  tone = "blue",
  large = false,
  src,
}: {
  initials: string;
  tone?: Tone;
  large?: boolean;
  src?: string | null;
}) {
  return src ? (
    <div className={`avatar avatar-image ${large ? "avatar-large" : ""}`}>
      <img src={src} alt={initials} />
    </div>
  ) : (
    <div className={`avatar avatar-${tone} ${large ? "avatar-large" : ""}`}>{initials}</div>
  );
}
function Sidebar({
  active,
  setActive,
  open,
  setOpen,
  onSignOut,
  onEditProfile,
  onOpenSupport,
}: {
  active: string;
  setActive: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  onSignOut: () => void | Promise<void>;
  onEditProfile: () => void;
  onOpenSupport: () => void;
}) {
  const { t: tr, locale } = useI18n();
  const { openRequests, archivedRequests, viewer, hasClientRequests } = useData();
  const country = COUNTRIES.find((item) => item.code === viewer.countryCode.trim().toUpperCase())
    ?? COUNTRIES.find((item) => item.name.toLowerCase() === viewer.country.trim().toLowerCase());
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const allItems = [
    ["Dashboard", LayoutDashboard],
    ["Requests", ClipboardList],
    ["Archived requests", Archive],
    ["Client", Users],
    ["Handymen", Wrench],
    ["Schedule", CalendarDays],
    ["Testimonials & ratings", Star],
  ] as const;
  const items = allItems.filter(([label]) => !(label === "Client" && viewer.role === "client"));
  async function handleSignOutClick() {
    if (signingOut) return;
    setSigningOut(true);
    setMenuOpen(false);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }
  useEffect(() => {
    if (!open) { setMenuOpen(false); return; }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);
  return (
    <>
    {open && <button type="button" className="sidebar-backdrop" aria-label={tr("Close navigation")} onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand">
        <Link to="/" aria-label={tr("HandyFlow home")} onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-md text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <div className="brand-mark">
            <Hammer />
          </div>
          <span>{tr("Handy")}<span className="brand-accent">{tr("Flow")}</span></span>
        </Link>
        <button className="mobile-close" onClick={() => setOpen(false)} aria-label={tr("Close navigation")}>
          <X />
        </button>
      </div>
      <div className="sidebar-scroll">
      <nav aria-label={tr("Main navigation")}>
        <p className="nav-label flex items-center gap-2">
          {country && <FlagImg code={country.code} />}
          <span>{country?.name || viewer.country || "Country not set"}</span>
        </p>
        {items.map(([label, Icon]) => (
          <button
            type="button"
            key={label}
            className={`nav-item ${active === label ? "nav-item-active" : ""}`}
            onClick={() => {
              setActive(label);
              setOpen(false);
            }}
          >
            <Icon />
            {tr(label)}
            {label === "Requests" && <span className="nav-count">{openRequests.length}</span>}
            {label === "Archived requests" && <span className="nav-count">{archivedRequests.length}</span>}
          </button>
        ))}
        <p className="nav-label nav-label-spaced">{tr("Manage")}</p>
        {(viewer.role !== "handyman" || hasClientRequests) && <button
          type="button"
          className={`nav-item ${active === "Payments" ? "nav-item-active" : ""}`}
          onClick={() => {
            setActive("Payments");
            setOpen(false);
          }}
        >
          <CircleDollarSign />{tr("Payments")}</button>}
        {viewer.role === "handyman" && (
          <button type="button" className={`nav-item ${active === "Income" ? "nav-item-active" : ""}`}
            onClick={() => { setActive("Income"); setOpen(false); }}>
            <CircleDollarSign />{tr("Income")}</button>
        )}
        <button
          type="button"
          className={`nav-item ${active === "Settings" ? "nav-item-active" : ""}`}
          onClick={() => {
            setActive("Settings");
            setOpen(false);
          }}
        >
          <Settings />{tr("Settings")}</button>
      </nav>
      <div className="sidebar-help">
        <ShieldCheck />
        <strong>{tr("Need a hand?")}</strong>
        <span>{tr("Our support team is here.")}</span>
        <button type="button" onClick={() => { setOpen(false); onOpenSupport(); }}>{tr("Get support")}<ChevronRight />
        </button>
      </div>
      </div>
      <div className="user-mini">
        <Avatar initials={viewer.initials} tone="coral" src={viewer.avatarUrl} />
        <div>
          <strong>{viewer.name}</strong>
          <span>{signingOut ? tr("Signing out…") : tr("Signed in")}</span>
        </div>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="icon-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={tr("Account menu")}
            aria-expanded={menuOpen}
          >
            <MoreHorizontal />
          </button>
          {menuOpen && (
            <div className="account-menu">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setOpen(false);
                  onEditProfile();
                }}
              >{tr("Change profile")}</button>
              <button
                type="button"
                onClick={() => {
                  void handleSignOutClick();
                }}
              >{tr("Log out")}</button>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
function Topbar({
  setOpen,
  dark,
  setDark,
  active,
  onSignOut,
  onEditProfile,
  notifications,
  unread,
  onOpenNotifications,
  onClearNotifications,
  onNotificationClick,
  search,
  onSearchChange,
}: {
  setOpen: (v: boolean) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
  active: string;
  onSignOut: () => void | Promise<void>;
  onEditProfile: () => void;
  notifications: AppNotification[];
  unread: number;
  onOpenNotifications: () => void;
  onClearNotifications: () => void;
  onNotificationClick: (taskId: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const { t: tr, locale } = useI18n();
  const { viewer } = useData();
  const [proOpen, setProOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [signingOut, setSigningOut] = useState(false);
  async function handleSignOutClick() {
    if (signingOut) return;
    setSigningOut(true);
    setMenuOpen(false);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label={tr("Open navigation")}>
        <Menu />
      </button>
      <div className="crumb">
        <span className="crumb-muted">{tr("Workspace")}</span>
        <ChevronRight />
        <strong>{tr(active)}</strong>
      </div>
      {proOpen && <GetProDialog onClose={() => setProOpen(false)} />}
      <div className="top-actions">
        <button type="button" className="primary-button get-pro-button" onClick={() => setProOpen(true)}>{tr("Get Pro")}</button>
        <label className="search-box">
          <Search />
          <input
            aria-label={tr("Search")}
            placeholder={tr("Search handymen, feedback...")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
        <button className="icon-button theme-button" onClick={() => setDark(!dark)} aria-label={tr("Toggle theme")}>
          {dark ? <Sun /> : <Moon />}
        </button>
        <div style={{ position: "relative" }}>
          <button
            className="icon-button notification"
            aria-label={tr("Notifications")}
            onClick={() => {
              const next = !notifOpen;
              setNotifOpen(next);
              if (next) onOpenNotifications();
            }}
          >
            <Bell />
            {unread > 0 && <span>{unread}</span>}
          </button>
          {notifOpen && (
            <div className="notif-panel">
              <header className="flex items-center justify-between gap-2">
                <span>{tr("Notifications")}</span>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={onClearNotifications}
                  >{tr("Clear all")}</button>
                )}
              </header>
              {notifications.length === 0 ? (
                <p className="notif-empty">{tr("Nothing new yet.")}</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="notif-item notif-item-button"
                    onClick={() => {
                      setNotifOpen(false);
                      onNotificationClick(n.taskId);
                    }}
                  >
                    <strong>{n.title}</strong>
                    <span>{n.body}</span>
                    <small>{new Date(n.at).toLocaleTimeString(locale)}</small>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="top-profile"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            style={{ cursor: "pointer", background: "transparent", border: 0 }}
          >
            <Avatar initials={viewer.initials} tone="blue" src={viewer.avatarUrl} />
            <div>
              <strong>{viewer.name}</strong>
              <span>{signingOut ? tr("Signing out…") : viewer.role === "handyman" ? tr("Handyman") : tr("Client")}</span>
            </div>
            <ChevronDown />
          </button>
          {menuOpen && (
            <div className="account-menu account-menu-below">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEditProfile();
                }}
              >{tr("Change profile")}</button>
              <button
                type="button"
                onClick={() => {
                  void handleSignOutClick();
                }}
              >{tr("Log out")}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
function StatCard({
  label,
  note,
  Icon,
  tone,
  value,
}: {
  label: string;
  note: string;
  Icon: React.ComponentType;
  tone: string;
  value: number;
}) {
  const { t: tr, locale } = useI18n();
  const { takenRequests, openRequests, handymen, viewer } = useData();
  const { openHandyman } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [review, setReview] = useState<{
    item: WorkspaceData["takenRequests"][number];
    focus: "rating" | "feedback";
  } | null>(null);
  const isClient = viewer.role === "client";
  const isCompleted = label === "Completed projects";
  const actionsRef = useRef<HTMLDivElement>(null);
  const empty = value === 0;

  const detailItems: { title: string; meta: string; badge?: string; handymanId?: string }[] =
    label === "Active requests"
      ? openRequests.map((r) => ({
          title: r.title,
          meta: `${r.client} · ${tr(r.category)}`,
          badge: r.status,
        }))
      : label === "Available handymen"
        ? handymen
            .filter((h) => h.available)
            .map((h) => ({
              title: h.name,
              meta: `${h.role} · ★ ${h.rating} · ${h.jobs} jobs`,
              badge: h.rate,
              handymanId: h.id,
            }))
        : label === "Active projects"
          ? takenRequests
              .filter((t) => t.status !== "Done")
              .map((t) => ({
                title: t.title,
                meta: isClient ? `Handyman: ${t.handyman}` : `Client: ${t.client}`,
                badge: t.status,
              }))
          : takenRequests
              .filter((t) => t.status === "Done")
              .map((t) => ({
                title: t.title,
                meta: isClient ? `Handyman: ${t.handyman}` : `Client: ${t.client}`,
                badge: t.rated ? "Rated" : "Not rated",
              }));

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);


  function openReview(focus: "rating" | "feedback") {
    setMenuOpen(false);
    const item = takenRequests.find((t) => t.status === "Done" && !t.rated);
    if (!item) {
      toast.info(tr("No completed projects waiting for your review."));
      return;
    }
    setReview({ item, focus });
  }

  return (
    <article
      className={`stat-card stat-card-hover${empty ? "" : " stat-card-tappable"}`}
      onClick={(e) => {
        if (empty) return;
        if (actionsRef.current && actionsRef.current.contains(e.target as Node)) return;
        setMenuOpen(!menuOpen);
      }}
    >
      <div className={`stat-icon stat-${tone}`}>
        <Icon />
      </div>
      <div className="stat-copy">
        <span>{tr(label)}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
      <div className="stat-card-actions" ref={actionsRef}>
        <button
          type="button"
          className="icon-button"
          aria-label={`${tr(label)} options`}
          aria-expanded={menuOpen}
          disabled={empty}
          title={empty ? tr("Nothing to show yet") : undefined}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <MoreHorizontal className="card-menu" />
        </button>
        {menuOpen && (
          <div className="account-menu account-menu-below task-card-menu">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDetailsOpen(true);
              }}
            >{tr("Show details")}</button>
            {isClient && isCompleted && (
              <>
                <button type="button" onClick={() => openReview("rating")}>{tr("Rate handyman")}</button>
                <button type="button" onClick={() => openReview("feedback")}>{tr("Project feedback")}</button>
              </>
            )}
          </div>
        )}
      </div>
      {detailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-background p-6 text-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{tr(label)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {value} {value === 1 ? tr("item") : tr("items")} · {note}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                aria-label={tr("Close")}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {detailItems.map((item, i) => (
                <li
                  key={`${item.title}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  {item.handymanId ? (
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left hover:opacity-80"
                      onClick={() => {
                        setDetailsOpen(false);
                        openHandyman(item.handymanId!);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
                      </div>
                      {item.badge && (
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs capitalize">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
                      </div>
                      {item.badge && (
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs capitalize">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {review && (
        <TaskReviewDialog item={review.item} focus={review.focus} onClose={() => setReview(null)} />
      )}
    </article>
  );
}
function StatCards() {
  const { t: tr, locale } = useI18n();
  const { stats } = useData();
  const values = [stats.activeRequests, stats.availableHandymen, stats.activeProjects, stats.completed];
  return (
    <section className="stats-grid" aria-label={tr("Business summary")}>
      {statMeta.map(([label, note, Icon, tone], index) => (
        <StatCard key={label} label={tr(label)} note={tr(note)} Icon={Icon} tone={tone} value={values[index] ?? 0} />
      ))}
    </section>
  );
}
function Dashboard({ setActive }: { setActive: (v: string) => void }) {
  const { t: tr, locale } = useI18n();
  const { takenRequests, viewer } = useData();
  const isClient = viewer.role === "client";
  const todayLabel = new Date().toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{todayLabel}</p>
          <h1>{tr("Good morning,")}{" "}{viewer.name.split(" ")[0]}</h1>
          <p className="subheading">{tr("A quick view of your HandyFlow workspace.")}</p>
        </div>
        <button className="primary-button" onClick={() => setActive("Requests")}>
          <Plus />{tr("New request")}</button>
      </div>
      <StatCards />
      <section className="panel activity-panel">
        <div className="panel-heading">
          <div>
            <h2>{tr("Recent activity")}</h2>
            <p>{tr("Latest updates across your taken requests.")}</p>
          </div>
          {!isClient && (
            <button className="text-button" onClick={() => setActive("Client")}>{tr("View tasks")}<ChevronRight />
            </button>
          )}
        </div>
        <div className="activity-strip">
          {takenRequests.slice(0, 3).map((item) => (
            <div className="activity-item" key={item.title}>
              <Avatar initials={item.initials} tone={item.tone} />
              <div>
                <strong>{item.title}</strong>
                <span>
                  {item.client} · {tr(item.category)}
                </span>
              </div>
              <Badge tone={item.status === "In progress" ? "progress" : "new"}>{tr(item.status)}</Badge>
            </div>
          ))}
        </div>
      </section>
      <FeedbackPanel />
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-3.5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

function FeedbackPanel({ request }: { request?: OpenRequest } = {}) {
  const { t: tr, locale } = useI18n();
  const data = useData();
  const feedback = (data.feedback ?? []).filter((entry) => !request || entry.taskId === request.id);
  const takenRequests = (data.takenRequests ?? []).filter((item) => !request || item.id === request.id);
  const viewer = data.viewer;
  const [review, setReview] = useState<{
    item: WorkspaceData["takenRequests"][number];
    focus: "rating" | "feedback";
  } | null>(null);

  const pending = takenRequests.filter((t) => t.status === "Done" && !t.rated);
  const isClient = request ? request.mineAsClient : viewer.role === "client";

  return (
    <section className="panel activity-panel" aria-label={tr("Feedback and ratings")}>
      <div className="panel-heading">
        <div>
          <h2>{request ? tr("Testimonials & ratings") : tr("Feedback & ratings")}</h2>
          <p>
            {isClient
              ? tr("Rate your handymen after a project is completed — they can rate you too.")
              : tr("Rate your clients after a project is completed — they can rate you too.")}
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mt-2 space-y-2">
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
            >
              <div className="text-sm">
                <strong className="font-semibold">{item.title}</strong>
                <span className="ml-2 text-muted-foreground">
                  {isClient ? item.handyman : item.client}{" "}{tr("· completed")}</span>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => setReview({ item, focus: "rating" })}
              >{tr("Leave feedback")}</button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {feedback.length === 0 && pending.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {request?.status === "cancelled" ? tr("This request was cancelled. Ratings are available only for completed projects.") : tr("No feedback yet. Reviews become available once a project is completed.")}
          </p>
        )}
        {feedback.map((f) => (
          <div key={f.id} className="rounded-lg border border-border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Avatar initials={f.authorInitials} tone="blue" />
              <div className="min-w-0 flex-1">
                <strong className="text-sm font-semibold">{f.authorName}</strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {f.mine ? tr("you rated") : tr("rated")} {f.targetName} · {f.taskTitle}
                </span>
              </div>
              <Stars value={f.rating} />
            </div>
            {f.comment && <p className="mt-2 text-sm text-muted-foreground">{f.comment}</p>}
          </div>
        ))}
      </div>

      {review && (
        <TaskReviewDialog item={review.item} focus={review.focus} onClose={() => setReview(null)} />
      )}
    </section>
  );
}

function TaskDetailsDialog({
  item,
  onClose,
}: {
  item: WorkspaceData["takenRequests"][number];
  onClose: () => void;
}) {
  const { t: tr, locale } = useI18n();
  const { viewer } = useData();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="text-sm text-muted-foreground">
              {item.client} · {tr(item.category)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close")} className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{item.description || "No description provided."}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">{tr("Status")}</dt>
            <dd className="font-medium">{tr(item.status)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tr("Priority")}</dt>
            <dd className="font-medium">{item.priority}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tr("Location")}</dt>
            <dd className="font-medium">{item.location}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tr("Due")}</dt>
            <dd className="font-medium">{item.due}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tr("Assigned to")}</dt>
            <dd className="font-medium">{item.handyman}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tr("Agreed price")}</dt>
            <dd className="font-medium">{item.agreedPrice != null ? `$${item.agreedPrice}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tr("Progress")}</dt>
            <dd className="font-medium">{item.progress}%</dd>
          </div>
        </dl>
        {viewer.role === "handyman" && <ClientContact taskId={item.id} />}
      </div>
    </div>
  );
}

function TaskReviewDialog({
  item,
  focus,
  onClose,
}: {
  item: WorkspaceData["takenRequests"][number];
  focus: "rating" | "feedback";
  onClose: () => void;
}) {
  const { t: tr, locale } = useI18n();
  const queryClient = useQueryClient();
  const { viewer, archivedRequests } = useData();
  const ownRequest = archivedRequests.find((request) => request.id === item.id);
  const asClient = ownRequest ? ownRequest.mineAsClient : viewer.role !== "handyman";
  const counterpart = asClient ? item.handyman : item.client;
  const submit = useServerFn(submitReview);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      toast.error(tr("Please pick a star rating first."));
      return;
    }
    setSaving(true);
    try {
      await submit({ data: { taskId: item.id, rating, comment } });
      toast.success(tr("Thanks! Your review was submitted."));
      await queryClient.invalidateQueries({ queryKey: ["workspace"] });
      onClose();
    } catch (err) {
      toast.error(tr(err instanceof Error ? err.message : "Couldn't submit the review."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-background p-6 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {focus === "rating" ? `Rate ${counterpart}` : tr("Project feedback")}
            </h2>

            <p className="text-sm text-muted-foreground">{item.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close")} className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium">{tr("Your rating")}</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                className="rounded-md p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`size-7 ${
                    n <= (hovered || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="review-comment" className="text-sm font-medium">{tr("Feedback about the project")}</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={tr("How did the job go? Anything worth mentioning?")}
            className="mt-2 w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >{tr("Cancel")}</button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? tr("Submitting…") : tr("Submit review")}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ item }: { item: WorkspaceData["takenRequests"][number] }) {
  const { t: tr, locale } = useI18n();
  const { viewer } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reviewFocus, setReviewFocus] = useState<"rating" | "feedback" | null>(null);
  const canReview =
    (viewer.role === "client" || viewer.role === "handyman") && item.status === "Done" && !item.rated;


  return (
    <article className="task-card task-card-hover">
      <div className="task-card-top">
        <Badge tone={item.status === "Done" ? "success" : item.status === "In progress" ? "progress" : "new"}>
          {tr(item.status)}
        </Badge>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="icon-button"
            aria-label={tr("Task options")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal />
          </button>
          {menuOpen && (
            <div className="account-menu account-menu-below task-card-menu">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setDetailsOpen(true);
                }}
              >{tr("Show details")}</button>
              {canReview && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setReviewFocus("rating");
                    }}
                  >{tr("Rate handyman")}</button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setReviewFocus("feedback");
                    }}
                  >{tr("Project feedback")}</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {detailsOpen && <TaskDetailsDialog item={item} onClose={() => setDetailsOpen(false)} />}
      {reviewFocus && (
        <TaskReviewDialog item={item} focus={reviewFocus} onClose={() => setReviewFocus(null)} />
      )}
      <h3>{item.title}</h3>
      <p>
        {item.client} <span>·</span> {tr(item.category)}
      </p>
      <div className="task-assignee">
        <Avatar
          initials={item.handyman
            .split(" ")
            .map((x) => x[0])
            .join("")}
          tone={item.tone}
        />
        <span>{tr("Assigned to")}<strong>{item.handyman}</strong>
        </span>
      </div>
      <div className="task-meta">
        <span>
          <Clock3 /> {item.due}
        </span>
        <span className={`priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span>
      </div>
      <div className="task-progress">
        <div>
          <span>{tr("Progress")}</span>
          <strong>{item.progress}%</strong>
        </div>
        <div className="progress-track">
          <div style={{ width: `${item.progress}%` }} />
        </div>
      </div>
    </article>
  );
}
function ClientView() {
  const { t: tr, locale } = useI18n();
  const { clientTasks } = useData();
  const [filter, setFilter] = useState("All");
  const groups = filter === "All" ? ["To do", "In progress", "Done"] : [filter];
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{tr("Taken requests")}</p>
          <h1>{tr("Client tasks")}</h1>
          <p className="subheading">{tr("Every accepted request, organized by what needs to happen next.")}</p>
        </div>
        <button className="primary-button">
          <Plus />{tr("Take a request")}</button>
      </div>
      <section className="panel task-board-panel">
        <div className="board-toolbar">
          <div className="filter-pills">
            {["All", "To do", "In progress", "Done"].map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={filter === item ? "filter-active" : ""}>
                {item}
                {item !== "All" && <span>{clientTasks.filter((task) => task.status === item).length}</span>}
              </button>
            ))}
          </div>
          <button className="filter-button">
            <Filter />{tr("Filter")}</button>
        </div>
        <div className="task-board">
          {groups.map((group) => (
            <section className="task-column" key={group}>
              <div className="column-heading">
                <h2>
                  <span className={`column-dot dot-${group.toLowerCase().replace(" ", "-")}`} />
                  {group}
                </h2>
                <span>{clientTasks.filter((item) => item.status === group).length}</span>
                <Plus />
              </div>
              <div className="task-column-list">
                {clientTasks
                  .filter((item) => item.status === group)
                  .map((item) => (
                    <TaskCard item={item} key={item.title} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
function RequestMapView({ requests }: { requests: OpenRequest[] }) {
  const { t: tr, locale } = useI18n();
  const [coords, setCoords] = useState<
    Record<string, { lat: number; lon: number; display: string } | null | undefined>
  >({});
  useEffect(() => {
    let cancelled = false;
    async function run() {
      for (const r of requests) {
        if (cancelled) return;
        if (coords[r.id] !== undefined) continue;
        const hit = await geocodeAddress(r.location);
        if (cancelled) return;
        setCoords((prev) => ({
          ...prev,
          [r.id]: hit ? { lat: hit.latitude, lon: hit.longitude, display: hit.formattedAddress } : null,
        }));
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);
  if (!requests.length) return <p className="map-empty">{tr("No requests to display on the map.")}</p>;
  return (
    <div className="map-grid">
      {requests.map((r) => {
        const c = coords[r.id];
        return (
          <article className="map-card" key={r.id}>
            <div className="map-card-head">
              <Avatar initials={r.initials} tone={r.tone} />
              <div className="min-w-0">
                <strong>{r.title}</strong>
                <span>
                  {r.client} · {r.location}
                </span>
              </div>
              <Badge tone="new">{tr(r.category)}</Badge>
            </div>
            {c ? (
              <iframe
                title={`Map for ${r.title}`}
                src={mapEmbedUrl(c.lat, c.lon)}
                className="map-embed"
                loading="lazy"
              />
            ) : c === null ? (
              <div className="map-empty">{tr("Location not found")}</div>
            ) : (
              <div className="map-loading">{tr("Locating…")}</div>
            )}
          </article>
        );
      })}
    </div>
  );
}
function RequestListView({ archivedOnly = false }: { archivedOnly?: boolean }) {
  const { t: tr, locale } = useI18n();
  const { openRequests, archivedRequests, viewer } = useData();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taking, setTaking] = useState<OpenRequest | null>(null);
  const [requestedView, setView] = useState<"List" | "Map" | "Calendar" | "Archived" | "Contact details" | "Activity log" | "Testimonials & ratings">(archivedOnly ? "Archived" : "List");
  const listView = archivedOnly ? "Archived" : "List";
  const requests = archivedOnly ? archivedRequests : openRequests;
  const searchTerm = query.trim().toLocaleLowerCase();
  const visible = requests.filter((item) =>
    (filter === "All" || item.category === filter) &&
    (!searchTerm || [item.title, item.description, item.client, item.location, item.category, ...item.labels]
      .some((value) => value.toLocaleLowerCase().includes(searchTerm))),
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedRequest = visible.find((item) => item.id === focusedId);
  const contactRequest = focusedRequest?.assigned
    && (focusedRequest.mineAsClient || focusedRequest.takenByMe)
    && (archivedOnly || (focusedRequest.status !== "completed" && focusedRequest.status !== "cancelled"))
      ? focusedRequest : null;
  const view = (requestedView === "Contact details" && !contactRequest) || ((requestedView === "Activity log" || requestedView === "Testimonials & ratings") && !focusedRequest) ? listView : requestedView;
  useEffect(() => {
    if (!focusedRequest) {
      setFocusedId(null);
      if (requestedView === "Activity log" || requestedView === "Testimonials & ratings") setView(listView);
    }
    if (!contactRequest && requestedView === "Contact details") setView(listView);
  }, [focusedRequest, contactRequest, requestedView, listView]);
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{archivedOnly ? tr("Request history") : viewer.role === "client" ? tr("Your requests") : tr("Open opportunities")}</p>
          <h1>{archivedOnly ? tr("Archived requests") : tr("Requests")}</h1>
          <p className="subheading">
            {archivedOnly ? tr("Your completed and cancelled requests.") : viewer.role === "client"
              ? tr("Every request you created, with its current status.")
              : tr("Browse work that is ready to be taken by your team.")}
          </p>
        </div>
        {!archivedOnly && <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
          <Plus />{tr("Create request")}</button>}
      </div>
      <section className="panel requests-list-panel">
        <div className="request-list-header">
          <div className="list-tabs">
            <button className={view === listView ? "list-tab-active" : ""} onClick={() => setView(listView)}>{tr("List")}</button>
            {!archivedOnly && <><button className={view === "Map" ? "list-tab-active" : ""} onClick={() => setView("Map")}>{tr("Map")}</button>
            <button className={view === "Calendar" ? "list-tab-active" : ""} onClick={() => setView("Calendar")}>{tr("Calendar")}</button></>}
            {contactRequest && <button type="button" className={view === "Contact details" ? "list-tab-active" : ""} onClick={() => setView("Contact details")}>{tr("Contact details")}</button>}
            {focusedRequest && <button type="button" className={view === "Activity log" ? "list-tab-active" : ""} onClick={() => setView("Activity log")}>{tr("Activity log")}</button>}
            {archivedOnly && focusedRequest && <button type="button" className={view === "Testimonials & ratings" ? "list-tab-active" : ""} onClick={() => setView("Testimonials & ratings")}>{tr("Testimonials & ratings")}</button>}

          </div>
          <div className="request-tools">
            <label className="compact-search">
              <Search />
              <input aria-label={tr("Search requests")} placeholder={tr("Search requests...")} value={query} onChange={(event) => { setQuery(event.target.value); setView(listView); }} />
            </label>
            <button type="button" className="filter-button" aria-expanded={filtersOpen} aria-controls="request-category-filters" onClick={() => { setFiltersOpen(!filtersOpen); setView(listView); }}>
              <Filter />{tr("Filter")}</button>
          </div>
        </div>
        {view !== "Contact details" && view !== "Activity log" && view !== "Testimonials & ratings" && (
          <div className="list-filter-row">
            <div>
              <strong>{visible.length} {archivedOnly ? tr("archived") : tr("open")}{" "}{tr("requests")}</strong>
              <span>{archivedOnly ? tr(" · Completed and cancelled") : viewer.role === "client" ? tr(" · Created by you") : tr(" · Available to assign")}</span>
            </div>
            {filtersOpen && <div className="filter-pills" id="request-category-filters">
              {["All", ...Array.from(new Set(requests.map((item) => item.category)))].map((item) => (
                <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={filter === item ? "filter-active" : ""}>
                  {item}
                </button>
              ))}
            </div>}
          </div>
        )}
        {archivedOnly && view === "Testimonials & ratings" && focusedRequest && (
          <section className="space-y-4 p-5" aria-label={tr("Selected request testimonials and ratings")}>
            <h2 className="font-semibold">{focusedRequest.title}</h2>
            <FeedbackPanel key={focusedRequest.id} request={focusedRequest} />
          </section>
        )}
        {view === "Activity log" && focusedRequest && (
          <section className="space-y-4 p-5" aria-label={tr("Request activity log")}>
            <h2 className="font-semibold">{focusedRequest.title}</h2>
            <RequestActivityLog key={focusedRequest.id} taskId={focusedRequest.id} />
          </section>
        )}
        {view === "Contact details" && contactRequest && (
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted-foreground">{tr("Contact details for your selected request.")}</p>
            <article className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">{contactRequest.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{tr(STATUS_LABELS[contactRequest.status] ?? contactRequest.status)}</p>
              <ClientContact key={contactRequest.id} taskId={contactRequest.id} participant counterpart={contactRequest.mineAsClient ? "Handyman" : "Client"} />
            </article>
          </div>
        )}
        {view === "List" && (
          <div className="open-request-list">
            <div className="open-request-heading">
              <span>{tr("Request")}</span>
              <span>{tr("Deadline")}</span>
              <span>{tr("Budget")}</span>
              <span>{tr("Priority")}</span>
              <span>{tr("Status")}</span>
              <span>{tr("Action")}</span>
            </div>
            {visible.map((item) => (
              <article className={`open-request-row cursor-pointer ${focusedId === item.id ? "request-row-selected" : ""}`} key={item.id}
                tabIndex={0} aria-label={`Select request: ${item.title}`} aria-current={focusedId === item.id ? "true" : undefined}
                onClick={() => setFocusedId(item.id)}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault(); setFocusedId(item.id);
                  }
                }}>
                <div className="open-request-title">
                  <Avatar initials={item.initials} tone={item.tone} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.client} <i /> {item.location}
                    </span>
                    <div className="request-labels">
                      {item.labels.map((label) => (
                        <em key={label}>{tr(label)}</em>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="open-request-cell">
                  <strong>{item.deadline}</strong>
                  <span>{tr(item.category)}</span>
                </div>
                <div className="open-request-cell">
                  <strong>{item.budget}</strong>
                  <span>{tr("Estimated total")}</span>
                </div>
                <div>
                  <span
                    className={`priority priority-${item.priority === "Urgent" ? "high" : item.priority.toLowerCase()}`}
                  >
                    {item.priority}
                  </span>
                </div>
                <div>
                  <Badge
                    tone={
                      item.status === "completed"
                        ? "success"
                        : item.status === "in_progress" || item.status === "agreed"
                          ? "progress"
                          : "new"
                    }
                  >
                    {tr(STATUS_LABELS[item.status] ?? item.status)}
                  </Badge>
                </div>
                {viewer.role === "client" ? (
                  <button type="button" className="take-button" onClick={() => setTaking(item)}>
                    {item.status === "negotiating"
                      ? `Review offers (${item.offers.length})`
                      : item.status === "agreed"
                        ? tr("Start work")
                        : item.status === "in_progress"
                          ? tr("Mark completed")
                          : item.assigned && item.status === "pending"
                            ? tr("Awaiting new offer")
                            : (STATUS_LABELS[item.status] ?? item.status)}{" "}
                    <ChevronRight />
                  </button>
                ) : (
                  <button type="button" className="take-button" onClick={() => setTaking(item)}>
                    {item.status === "agreed" || item.status === "in_progress"
                      ? tr("Open details")
                      : item.offers.some((o) => o.mine && o.status === "pending")
                        ? tr("Update/withdraw offer")
                        : item.takenByMe
                          ? tr("Make an offer")
                          : tr("Take request")}{" "}
                    <ChevronRight />

                  </button>
                )}
              </article>
            ))}
          </div>
        )}
        {view === "Map" && <RequestMapView requests={visible} />}
        {view === "Calendar" && <RequestArrivalCalendar requests={visible} onOpen={(item) => { setFocusedId(item.id); setTaking(item); }} />}
        {view === "Archived" &&
          (visible.length ? (
            <div className="open-request-list">
              <div className="open-request-heading">
                <span>{tr("Request")}</span>
                <span>{tr("Deadline")}</span>
                <span>{tr("Budget")}</span>
                <span>{tr("Priority")}</span>
                <span>{tr("Status")}</span>
              </div>
              {visible.map((item) => (
                <article className={`open-request-row cursor-pointer ${focusedId === item.id ? "request-row-selected" : ""}`} key={item.id}
                  tabIndex={0} aria-label={`Select request: ${item.title}`} aria-current={focusedId === item.id ? "true" : undefined}
                  onClick={() => setFocusedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault(); setFocusedId(item.id);
                    }
                  }}>
                  <div className="open-request-title">
                    <Avatar initials={item.initials} tone={item.tone} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {item.client} <i /> {item.location}
                      </span>
                      <div className="request-labels">
                        {item.labels.map((label) => (
                          <em key={label}>{tr(label)}</em>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="open-request-cell">
                    <strong>{item.deadline}</strong>
                    <span>{tr(item.category)}</span>
                  </div>
                  <div className="open-request-cell">
                    <strong>{item.budget}</strong>
                    <span>{tr("Estimated total")}</span>
                  </div>
                  <div>
                    <span
                      className={`priority priority-${item.priority === "Urgent" ? "high" : item.priority.toLowerCase()}`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  <div>
                    <Badge tone={item.status === "completed" ? "success" : "new"}>
                      {item.status === "completed" ? tr("Completed") : tr("Cancelled")}
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="map-empty">{requests.length ? tr("No requests match your search or category.") : tr("No archived requests yet. Completed requests will appear here.")}</p>
          ))}
      </section>
      {dialogOpen && <RequestDialog defaultLocation={viewer.address} onClose={() => setDialogOpen(false)} />}
      {taking && <TakeRequestDialog key={taking.id} request={[...openRequests, ...archivedRequests].find((item) => item.id === taking.id) ?? taking} role={viewer.role} onClose={() => setTaking(null)} />}
    </div>
  );
}
function ScheduleView() {
  const { t: tr, locale } = useI18n();
  const { scheduleDays, scheduleTasks, weekLabel, viewer } = useData();
  const [mode, setMode] = useState("Week");
  const [monthOffset, setMonthOffset] = useState(0);
  const isHandyman = viewer.role === "handyman";
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekTotal = scheduleDays.reduce((sum, day) => sum + day.tasks.length, 0);
  const todayTasks = scheduleDays.find((day) => day.iso === todayIso)?.tasks ?? [];
  const upcoming = scheduleDays
    .filter((day) => day.iso > todayIso)
    .flatMap((day) => day.tasks.map((task) => ({ ...task, day })));

  const counterpartOf = (task: (typeof scheduleTasks)[number]) =>
    isHandyman ? task.client : task.handyman;

  // Month grid (Mon-first) for the visible month
  const base = new Date();
  const monthStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, 1));
  const monthLabel = monthStart.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const lead = (monthStart.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const monthCells = Array.from({ length: lead + daysInMonth }, (_, i) => {
    if (i < lead) return null;
    const d = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), i - lead + 1));
    const iso = d.toISOString().slice(0, 10);
    return { iso, date: i - lead + 1, tasks: scheduleTasks.filter((t) => t.iso === iso) };
  });
  const listTasks = [...scheduleTasks].filter((t) => t.iso >= todayIso);

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{tr("Team availability")}</p>
          <h1>{tr("Schedule")}</h1>
          <p className="subheading">{tr("Keep every accepted request moving on time.")}</p>
        </div>
        <button className="primary-button">
          <Plus />{tr("Add task")}</button>
      </div>
      <div className="schedule-controls">
        <div className="schedule-tabs">
          {["List", "Week", "Month"].map((item) => (
            <button key={item} onClick={() => setMode(item)} className={mode === item ? "schedule-tab-active" : ""}>
              {item}
            </button>
          ))}
        </div>
        <div className="schedule-date">
          <button aria-label={tr("Previous")} onClick={() => mode === "Month" && setMonthOffset((v) => v - 1)}>
            <ChevronRight className="rotate-180" />
          </button>
          <strong>{mode === "Month" ? monthLabel : weekLabel}</strong>
          <button aria-label={tr("Next")} onClick={() => mode === "Month" && setMonthOffset((v) => v + 1)}>
            <ChevronRight />
          </button>
        </div>
        <button className="today-button" onClick={() => setMonthOffset(0)}>{tr("Today")}</button>
      </div>
      <section className="panel schedule-workspace">
        <div className="schedule-summary">
          <div>
            <h2>{mode === "Month" ? monthLabel : mode === "List" ? tr("Upcoming") : tr("This week")}</h2>
            <p>
              {mode === "Week"
                ? `${weekTotal} scheduled tasks this week.`
                : mode === "Month"
                  ? `${monthCells.filter((c) => c && c.tasks.length).length} booked days this month.`
                  : `${listTasks.length} upcoming agreed tasks.`}
            </p>
          </div>
          <div className="schedule-legend">
            <span>
              <i className="legend-dot legend-blue" />{tr("Booked")}</span>
            <span>
              <i className="legend-dot legend-muted" />{tr("Available")}</span>
          </div>
        </div>
        {mode === "Week" && (
          <div className="weekly-calendar">
            <div className="calendar-time-label">{tr("GMT")}</div>
            {scheduleDays.map((day) => (
              <div className={`calendar-day ${day.iso === todayIso ? "calendar-today" : ""}`} key={day.day}>
                <div className="calendar-day-header">
                  <span>{day.day}</span>
                  <strong>{day.date}</strong>
                </div>
                <div className="calendar-tasks">
                  {day.tasks.length ? (
                    day.tasks.map((task) => (
                      <article className={`calendar-task task-${task.tone}`} key={`${task.title}-${task.time}`}>
                        <small>{task.time}</small>
                        <strong>{task.title}</strong>
                        <span>{counterpartOf(task)}</span>
                        <em>
                          {tr(task.category)} · {tr(task.status)}
                        </em>
                      </article>
                    ))
                  ) : (
                    <div className="empty-day">
                      <span />{tr("Open day")}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {mode === "Month" && (
          <div className="month-calendar">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div className="month-head" key={d}>
                {d}
              </div>
            ))}
            {monthCells.map((cell, i) =>
              cell ? (
                <div
                  key={cell.iso}
                  className={`month-cell ${cell.tasks.length ? "month-booked" : ""} ${cell.iso === todayIso ? "month-today" : ""}`}
                >
                  <span className="month-date">{cell.date}</span>
                  {cell.tasks.slice(0, 3).map((task) => (
                    <article className={`month-task task-${task.tone}`} key={`${task.title}-${task.time}`}>
                      <strong>{task.title}</strong>
                      <span>{counterpartOf(task)}</span>
                    </article>
                  ))}
                  {cell.tasks.length > 3 && <small>+{cell.tasks.length - 3}{" "}{tr("more")}</small>}
                </div>
              ) : (
                <div className="month-cell month-empty" key={`pad-${i}`} />
              ),
            )}
          </div>
        )}
        {mode === "List" && (
          <div className="schedule-list">
            {listTasks.length ? (
              listTasks.map((task) => (
                <div className="schedule-list-row" key={`${task.iso}-${task.title}-${task.time}`}>
                  <div className="schedule-list-date">
                    <strong>{task.iso.slice(8, 10)}</strong>
                    <span>
                      {new Date(`${task.iso}T00:00:00Z`).toLocaleDateString(locale, {
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <div className={`upcoming-bar bar-${task.tone}`} />
                  <div className="schedule-list-body">
                    <strong>{task.title}</strong>
                    <span>
                      {counterpartOf(task)} · {tr(task.category)}
                      {task.location ? ` · ${task.location}` : ""}
                    </span>
                  </div>
                  <span className="schedule-list-meta">{task.time}</span>
                  <span className="status-badge">{tr(task.status)}</span>
                </div>
              ))
            ) : (
              <p className="map-empty">{tr("No agreed tasks scheduled yet.")}</p>
            )}
          </div>
        )}
      </section>

      <section className="panel upcoming-panel">
        <div className="panel-heading">
          <div>
            <h2>{tr("Upcoming tasks")}</h2>
            <p>{tr("Grouped by what is happening next.")}</p>
          </div>
          <button className="text-button">{tr("View all")}<ChevronRight />
          </button>
        </div>
        <div className="upcoming-groups">
          <div>
            <h3>{tr("Today")}<span>{todayTasks.length}</span>
            </h3>
            {todayTasks.map((task) => (
              <div className="upcoming-row" key={task.title}>
                <span className="upcoming-time">{task.time.split("–")[0]}</span>
                <div className={`upcoming-bar bar-${task.tone}`} />
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.client} · {tr(task.category)}
                  </span>
                </div>
                <button className="outline-button">{tr("Details")}<ChevronRight />
                </button>
              </div>
            ))}
          </div>
          <div>
            <h3>{tr("Upcoming")}<span>{upcoming.length}</span>
            </h3>
            {upcoming.slice(0, 5).map((task) => (
              <div className="upcoming-row" key={`${task.day.iso}-${task.title}`}>
                <span className="upcoming-date">
                  {task.day.day} {task.day.date}
                </span>
                <div className={`upcoming-bar bar-${task.tone}`} />
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.client} · {tr(task.category)}
                  </span>
                </div>
                <button className="outline-button">{tr("Details")}<ChevronRight />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
function HandymanProfileDialog({
  person,
  feedback,
  onClose,
}: {
  person: HandymanEntry;
  feedback: WorkspaceData["feedback"];
  onClose: () => void;
}) {
  const { t: tr, locale } = useI18n();
  const personFeedback = feedback.filter(
    (f) => f.direction === "client_to_handyman" && f.targetName === person.name,
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-background p-6 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar initials={person.initials} tone={person.tone} large />
            <div>
              <h2 className="text-lg font-semibold">{person.name}</h2>
              <p className="text-sm text-muted-foreground">{person.role}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close")} className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1">
            <Star className="size-4 fill-warning text-warning" />
            <strong>{person.rating}</strong>
            <span className="text-muted-foreground">({person.reviews}{" "}{tr("reviews)")}</span>
          </span>
          <span className="text-muted-foreground">{person.jobs}{" "}{tr("jobs completed")}</span>
          <strong>{person.rate}</strong>
        </div>

        <p className={person.available ? "mt-2 text-sm font-medium text-success" : "mt-2 text-sm font-medium text-destructive"}>
          {person.available ? tr("Available for work") : tr("Currently on a job")}
        </p>

        {person.location && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {person.location}
          </p>
        )}

        {person.specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {person.specialties.map((s) => (
              <span key={s} className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                {s}
              </span>
            ))}
          </div>
        )}

        {person.bio && <p className="mt-3 text-sm text-muted-foreground">{person.bio}</p>}

        <div className="mt-5">
          <h3 className="text-sm font-semibold">{tr("Public feedback")}</h3>
          {personFeedback.length ? (
            <ul className="mt-2 space-y-2">
              {personFeedback.map((f) => (
                <li key={f.id} className="rounded-lg border border-border p-3 text-sm">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Star className="size-3.5 fill-warning text-warning" /> {f.rating}/5
                  </span>
                  <p className="mt-1 text-muted-foreground">“{f.comment}”</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    — {f.authorName}, {f.taskTitle}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{tr("No public feedback yet.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HandymenView({
  query,
  onClearSearch,
  focusId,
  onFocusHandled,
}: {
  query: string;
  onClearSearch: () => void;
  focusId: string | null;
  onFocusHandled: () => void;
}) {
  const { t: tr, locale } = useI18n();
  const { handymen, handymenTotal, handymenAvailable, feedback } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (focusId) {
      setSelectedId(focusId);
      onFocusHandled();
    }
  }, [focusId, onFocusHandled]);
  const selected = selectedId ? (handymen.find((p) => p.id === selectedId) ?? null) : null;
  const q = query.trim().toLowerCase();
  const publicFeedback = feedback.filter((f) => f.direction === "client_to_handyman");
  const matched = q
    ? handymen.filter((p) => {
        const inCard = `${p.name} ${p.role}`.toLowerCase().includes(q);
        const inFeedback = publicFeedback.some(
          (f) => f.targetName === p.name && `${f.comment} ${f.authorName} ${f.taskTitle}`.toLowerCase().includes(q),
        );
        return inCard || inFeedback;
      })
    : handymen;
  const [inviteOpen, setInviteOpen] = useState(false);
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{tr("Your trusted crew")}</p>
          <h1>{tr("Handymen")}</h1>
          <p className="subheading">{tr("Coordinate your team and see who's ready for the next job.")}</p>
        </div>
        <button className="primary-button" onClick={() => setInviteOpen(true)}>
          <Plus />{tr("Invite handyman")}</button>
      </div>
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{tr("Country area")}</h2>
            {q ? (
              <p>
                {matched.length}{" "}{tr("result")}{" "}{matched.length === 1 ? "" : tr("s")}{" "}{tr("for \"")}{query.trim()}{" "}{tr("\"")}{" "}
                <button type="button" className="inline-link" onClick={onClearSearch}>{tr("Clear search")}</button>
              </p>
            ) : (
              <p>{handymenTotal}{" "}{tr("handymen in your country.")}</p>
            )}
          </div>
          <div className="filter-pills">
            <button className="filter-active">{tr("All")}<span>{handymenTotal}</span>
            </button>
            <button>{tr("Available")}<span>{handymenAvailable}</span>
            </button>
          </div>
        </div>
        {matched.length === 0 && q && (
          <div className="empty-state">
            <p>{tr("No handymen or public feedback match \"")}{query.trim()}{" "}{tr("\".")}</p>
            <button type="button" className="inline-link" onClick={onClearSearch}>{tr("Clear search")}</button>
          </div>
        )}
        <div className="handyman-grid">
          {matched.map((person) => {
            const personFeedback = publicFeedback.filter((f) => f.targetName === person.name);
            const quoted = q
              ? personFeedback.filter((f) => `${f.comment} ${f.authorName} ${f.taskTitle}`.toLowerCase().includes(q))
              : personFeedback;
            return (
            <div className="handyman-card" key={person.name}>
              <div className="handyman-top">
                <Avatar initials={person.initials} tone={person.tone} large />
                <span className={person.available ? "available-badge" : "busy-badge"}>
                  <span />
                  {person.available ? tr("Available") : tr("On a job")}
                </span>
              </div>
              <strong>{person.name}</strong>
              <span>{person.role}</span>
              <div className="handyman-meta">
                <span>
                  <Star /> {person.rating}
                </span>
                <span>{person.jobs}{" "}{tr("jobs")}</span>
                <strong>{person.rate}</strong>
              </div>
              {quoted.length > 0 && (
                <div className="handyman-feedback">
                  <span className="handyman-feedback-label">{tr("Public feedback")}</span>
                  {quoted.slice(0, 2).map((f) => (
                    <blockquote key={f.id}>
                      <Star /> {f.rating}/5 — “{f.comment}” <em>— {f.authorName}, {f.taskTitle}</em>
                    </blockquote>
                  ))}
                </div>
              )}
              <button className="outline-button" onClick={() => setSelectedId(person.id)}>{tr("View profile")}<ChevronRight />
              </button>
            </div>
            );
          })}
        </div>
      </section>
      {selected && (
        <HandymanProfileDialog person={selected} feedback={feedback} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
function PaymentsView() {
  const { t: tr, locale } = useI18n();
  const { payments, viewer } = useData();
  const isHandyman = viewer.role !== "client";
  const paid = payments.filter((p) => p.direction === "paid");
  const charged = payments.filter((p) => p.direction === "charged");
  const money = (n: number) => `$${n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const total = (list: typeof payments) => money(list.reduce((sum, p) => sum + p.amount, 0));
  const column = (title: string, subtitle: string, list: typeof payments) => (
    <section className="panel payments-column" key={title}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <strong className="payments-total">{total(list)}</strong>
      </div>
      {list.length ? (
        <div className="payments-list">
          {list.map((item) => (
            <article className="payments-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>
                  {item.counterparty} · {tr(item.category)}
                </span>
              </div>
              <div className="payments-meta">
                <span>{item.date}</span>
                <strong>{money(item.amount)}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="map-empty">{tr("No completed tasks yet.")}</p>
      )}
    </section>
  );
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{tr("Finance")}</p>
          <h1>{tr("Payments")}</h1>
          <p className="subheading">{tr("Agreed prices from completed tasks.")}</p>
        </div>
      </div>
      <div className={isHandyman ? "payments-grid" : ""}>
        {column(
          isHandyman ? "Paid as a client" : "Paid for your requests",
          "Requests you created and completed.",
          paid,
        )}
        {isHandyman && column("Charged as a handyman", "Tasks you completed for clients.", charged)}
      </div>
    </div>
  );
}
function TestimonialsView() {
  const { t: tr, locale } = useI18n();
  const { viewer } = useData();
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{tr("Your experience")}</p>
          <h1>{tr("Testimonials & ratings")}</h1>
          <p className="subheading">{tr("Review completed projects and share your experience with HandyFlow.")}</p>
        </div>
      </div>
      <FeedbackPanel />
      <ShareTestimonialPanel />
      {viewer.role === "admin" && <TestimonialAdminPanel />}
    </div>
  );
}
function SettingsView() {
  const { t: tr, locale } = useI18n();
  const { viewer } = useData();
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{tr("Account")}</p>
          <h1>{tr("Settings")}</h1>
          <p className="subheading">{tr("Update your personal details and contact info.")}</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>{tr("Profile details")}</h2>
            <p>{viewer.email}</p>
          </div>
        </div>
        <ProfileForm viewer={viewer} embedded />
      </section>
    </div>
  );
}
export function HandyFlowApp({ data, onSignOut }: { data: WorkspaceData; onSignOut: () => void }) {
  const [active, setActive] = useState("Dashboard");
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { items: notifications, unread, markRead, clearAll } = useTaskNotifications(data);
  const [search, setSearch] = useState("");
  const [handymanFocus, setHandymanFocus] = useState<string | null>(null);
  function openHandyman(id: string) {
    setActive("Handymen");
    setHandymanFocus(id);
  }
  function handleNotificationClick(_taskId: string) {
    setActive(data.viewer.role === "client" ? "Client" : "Requests");
  }
  function handleSearchChange(v: string) {
    setSearch(v);
    if (v.trim()) setActive("Handymen");
  }
  const visible = data.viewer.role === "handyman" && active === "Payments" && !data.hasClientRequests
    ? "Income"
    : data.viewer.role === "client" && active === "Client" ? "Dashboard" : active;
  return (
    <DataContext.Provider value={data}>
      <UIContext.Provider value={{ openHandyman }}>
      <main className={dark ? "app-shell dark-mode" : "app-shell"}>
        {profileOpen && <ProfileDialog viewer={data.viewer} onClose={() => setProfileOpen(false)} />}
        <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
        <Sidebar
          active={visible}
          setActive={setActive}
          open={open}
          setOpen={setOpen}
          onSignOut={onSignOut}
          onEditProfile={() => setProfileOpen(true)}
          onOpenSupport={() => setSupportOpen(true)}
        />
        <div className="main-area">
          <Topbar
            setOpen={setOpen}
            dark={dark}
            setDark={setDark}
            active={visible}
            onSignOut={onSignOut}
            onEditProfile={() => setProfileOpen(true)}
            notifications={notifications}
            unread={unread}
            onOpenNotifications={markRead}
        onClearNotifications={clearAll}
        onNotificationClick={handleNotificationClick}
        search={search}
        onSearchChange={handleSearchChange}
          />
          {visible === "Dashboard" && <Dashboard setActive={setActive} />}
          {visible === "Requests" && <RequestListView key="requests" />}
          {visible === "Archived requests" && <RequestListView key="archived" archivedOnly />}
          {visible === "Client" && <ClientView />}
          {visible === "Handymen" && (
            <HandymenView
              query={search}
              onClearSearch={() => setSearch("")}
              focusId={handymanFocus}
              onFocusHandled={() => setHandymanFocus(null)}
            />
          )}
          {visible === "Schedule" && <ScheduleView />}
          {visible === "Payments" && <PaymentsView />}
          {visible === "Income" && data.viewer.role === "handyman" && <IncomeView payments={data.payments} />}
          {visible === "Testimonials & ratings" && <TestimonialsView />}
          {visible === "Settings" && <SettingsView />}
          {!["Dashboard", "Requests", "Archived requests", "Client", "Handymen", "Schedule", "Payments", "Income", "Testimonials & ratings", "Settings"].includes(visible) && (
            <Dashboard setActive={setActive} />
          )}
        </div>
      </main>
      </UIContext.Provider>
    </DataContext.Provider>
  );
}
