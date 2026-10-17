import { LanguageProvider, LanguageSwitcher, useI18n } from "@/lib/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/crm/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { resetCrm } from "@/lib/mock-data";
function NotFoundComponent() {
  const { t: ui } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{ui("Page not found")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ui("The page you're looking for doesn't exist or has been moved.")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {ui("Go home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const { t: ui } = useI18n();
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {ui("This page didn't load")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ui("Something went wrong on our end. You can try refreshing or head back home.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {ui("Try again")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            {ui("Go home")}
          </a>
        </div>
      </div>
    </div>
  );
}
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DevLead CRM — Lead intelligence for software agencies" },
      {
        name: "description",
        content: "Find, qualify and win companies that need software development.",
      },
      { property: "og:title", content: "DevLead CRM" },
      {
        property: "og:description",
        content: "Find, qualify and win companies that need software development.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <LanguageProvider>
          {children}
          <LanguageSwitcher />
        </LanguageProvider>
        <Scripts />
      </body>
    </html>
  );
}
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const bare = path === "/" || path.startsWith("/auth");
  useEffect(() => {
    let activeUserId: string | null = null;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (nextUserId !== activeUserId) {
        resetCrm();
        queryClient.clear();
        activeUserId = nextUserId;
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") resetCrm();
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      {bare ? (
        <Outlet />
      ) : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
