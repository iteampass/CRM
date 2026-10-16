import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/personal-data";
import { demoMode } from "@/lib/data";
import { Bookmark, MapPin, ShieldAlert, ShieldCheck, Copy, Sparkles } from "lucide-react";
import { formatPrice, type Listing } from "@/lib/listings";

const riskStyle = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/15 text-foreground",
  high: "bg-destructive/10 text-destructive",
};

export function ListingCard({
  l,
  active,
  onHover,
}: {
  l: Listing;
  active?: boolean;
  onHover?: () => void;
}) {
  const { user, loading } = useAuth();
  const favorites = useFavorites();
  const saved = favorites.data?.some((item) => item.id === l.id) ?? false;
  return (
    <article
      onMouseEnter={onHover}
      className={`flex flex-col gap-4 rounded-2xl border bg-card p-3 transition sm:flex-row ${active ? "border-primary shadow-soft" : "hover:shadow-soft"}`}
    >
      <div className="relative sm:w-64">
        <img
          src={l.image}
          alt={l.title}
          loading="lazy"
          width={1024}
          height={768}
          className="h-44 w-full rounded-xl object-cover"
        />
        <span className="absolute left-2 top-2 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium">
          {l.foundAgo}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 py-1 pr-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {l.area}
          </span>
          {!user && !loading ? (
            <Link
              to="/account"
              aria-label="Sign in to save"
              className="rounded-full p-1.5 hover:bg-muted"
            >
              <Bookmark className="h-4 w-4" />
            </Link>
          ) : (
            <button
              aria-label={saved ? "Remove from favorites" : "Save to favorites"}
              aria-pressed={saved}
              disabled={
                demoMode ||
                loading ||
                favorites.isPending ||
                favorites.isError ||
                favorites.toggle.isPending
              }
              title={demoMode ? "Saving is unavailable in demo mode" : undefined}
              onClick={() => favorites.toggle.mutate({ id: l.id, saved })}
              className="rounded-full p-1.5 hover:bg-muted disabled:opacity-40"
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-current text-primary" : ""}`} />
            </button>
          )}
        </div>
        {(favorites.error || favorites.toggle.error) && (
          <p role="alert" className="text-xs text-destructive">
            {favorites.toggle.error?.message ?? favorites.error?.message}
            <button
              className="ml-2 underline"
              onClick={() => {
                favorites.toggle.reset();
                void favorites.refetch();
              }}
            >
              Retry
            </button>
          </p>
        )}
        <h3 className="text-lg font-semibold leading-tight">{l.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" />
            {l.score}% match
          </span>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${riskStyle[l.risk]}`}
          >
            {l.risk === "low" ? (
              <ShieldCheck className="h-3 w-3" />
            ) : (
              <ShieldAlert className="h-3 w-3" />
            )}
            {l.risk} risk
          </span>
          {l.duplicates > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Copy className="h-3 w-3" />
              {l.duplicates + 1} sources
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            `${l.beds} Bedrooms`,
            `${l.baths} Bath`,
            `${l.size} m²`,
            l.furnished ? "Furnished" : "Unfurnished",
          ].map((t) => (
            <span key={t} className="rounded-full border px-2.5 py-1 text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between">
          <p className="text-2xl font-bold text-primary">
            {formatPrice(l.price)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/month</span>
          </p>
          <span className="text-xs text-muted-foreground">via {l.source}</span>
        </div>
      </div>
    </article>
  );
}
