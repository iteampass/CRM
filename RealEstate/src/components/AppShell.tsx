import { useSearchLocation } from "@/lib/search-location";
import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Bell,
  Compass,
  Heart,
  LineChart,
  Map,
  Search,
  Settings,
  Shield,
  Bookmark,
  Building2,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { demoMode } from "@/lib/data";
const nav = [
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/imports", icon: Building2, label: "Imported apartments" },
  { to: "/map", icon: Map, label: "Map search" },
  { to: "/saved", icon: Bookmark, label: "Saved searches" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
  { to: "/alerts", icon: Bell, label: "Alerts" },
  { to: "/insights", icon: LineChart, label: "Price insights" },
  { to: "/account", icon: Settings, label: "Account" },
  { to: "/about", icon: Info, label: "About" },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const { t: ui } = useI18n();
  const { user } = useAuth();
  const { location, setLocation } = useSearchLocation();
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-20 flex-col items-center gap-2 border-r bg-card py-5 md:flex">
        <Link
          to="/"
          className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"
          aria-label={ui("Home")}
        >
          <Building2 className="h-5 w-5" />
        </Link>
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            title={ui(n.label)}
            aria-label={ui(n.label)}
            className="grid h-12 w-12 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted"
            activeProps={{ className: "!bg-accent !text-accent-foreground" }}
          >
            <n.icon className="h-5 w-5" />
          </Link>
        ))}
        <div className="flex-1" />
        <Link
          to="/admin"
          title={ui("Admin")}
          aria-label={ui("Admin")}
          className="grid h-12 w-12 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
          activeProps={{ className: "!bg-accent !text-accent-foreground" }}
        >
          <Shield className="h-5 w-5" />
        </Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b bg-card/90 px-6 backdrop-blur">
          <div className="flex rounded-full bg-muted p-1 text-sm font-medium">
            <span className="rounded-full bg-accent px-5 py-2 text-accent-foreground">
              {ui("Rent")}
            </span>
          </div>
          <div className="flex max-w-md flex-1 items-center rounded-full bg-muted pl-5">
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="flex-1 bg-transparent py-2.5 text-sm outline-none"
              aria-label={ui("City")}
            />
            <button
              className="m-1 grid h-9 w-14 place-items-center rounded-full bg-primary text-primary-foreground"
              aria-label={ui("Search")}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1" />
          <Link
            to="/alerts"
            className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-muted"
            aria-label={ui("Alerts")}
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            to="/account"
            className="rounded-full bg-primary-soft px-3 py-2 text-sm font-semibold text-accent-foreground"
          >
            {user ? ui("Account") : ui("Sign in")}
          </Link>
        </header>
        <main className="flex-1">
          {demoMode && (
            <p role="status" className="bg-accent px-6 py-3 text-sm">
              {ui(
                "Demo mode \u2014 sample apartments, not live rental inventory. Saving demo apartments is disabled.",
              )}
            </p>
          )}
          {children}
        </main>
        <footer className="border-t px-6 py-4 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground">
            {ui("About Nestly")}
          </Link>
        </footer>
        <nav className="sticky bottom-0 flex justify-around border-t bg-card py-2 md:hidden">
          {nav.slice(0, 5).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              aria-label={ui(n.label)}
              className="p-2 text-muted-foreground"
              activeProps={{ className: "!text-primary" }}
            >
              <n.icon className="h-5 w-5" />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  const { t: ui } = useI18n();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-8 pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{ui(title)}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{ui(sub)}</p>}
      </div>
      {children}
    </div>
  );
}
