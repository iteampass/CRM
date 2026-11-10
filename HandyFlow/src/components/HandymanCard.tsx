import { Heart, Plus, Star, Check } from "lucide-react";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/mock-data";

export function HandymanCard({
  handyman,
  invited,
  wishlisted,
  onInvite,
  onWishlist,
}: {
  handyman: User;
  invited?: boolean;
  wishlisted?: boolean;
  onInvite?: (id: string) => void;
  onWishlist?: (id: string) => void;
}) {
  return (
    <article className="surface-card hover-lift flex flex-col p-4">
      <div className="flex items-start gap-3">
        <Avatar name={handyman.name} initials={handyman.avatar} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{handyman.name}</h3>
          {handyman.reviews ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-warning text-warning" />
              <span className="font-medium text-foreground">{handyman.rating?.toFixed(1)}</span>
              <span>({handyman.reviews} reviews)</span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">New to Cadre</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {handyman.specialties?.map((s) => (
          <span
            key={s}
            className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 divide-x divide-border rounded-lg border border-border">
        <div className="p-3">
          <p className="text-xs font-medium">{handyman.location}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {handyman.jobs_done} jobs completed
          </p>
        </div>
        <div className="p-3">
          <p className="text-xs font-medium">${handyman.daily_rate}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Average daily rate
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onWishlist?.(handyman.id)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            wishlisted && "bg-accent",
          )}
        >
          <Heart className={cn("size-3.5", wishlisted && "fill-current")} />
          {wishlisted ? "Liked" : "Wishlist"}
        </button>
        <button
          type="button"
          onClick={() => onInvite?.(handyman.id)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            invited
              ? "border border-border text-muted-foreground hover:bg-accent"
              : "bg-brand text-brand-foreground hover:opacity-90",
          )}
        >
          {invited ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
          {invited ? "Invited" : "Invite"}
        </button>
      </div>

      <p
        className={cn(
          "mt-3 text-center text-xs font-medium",
          handyman.available ? "text-success" : "text-destructive",
        )}
      >
        {handyman.available ? "Available this week" : "May not be available"}
      </p>
    </article>
  );
}
