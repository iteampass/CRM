import { useI18n } from "@/lib/i18n";
import mapImg from "@/assets/map.jpg";
import { formatPrice, type Listing } from "@/lib/listings";
export function MapView({
  items,
  activeId,
  onSelect,
}: {
  items: Listing[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const { t: ui, locale: uiLocale } = useI18n();
  const active = items.find((i) => i.id === activeId);
  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      <img
        src={mapImg}
        alt={ui("City map")}
        className="h-full w-full object-cover"
        width={1024}
        height={1280}
      />
      {items.map((l) => (
        <button
          key={l.id}
          onClick={() => onSelect(l.id)}
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-xs font-semibold shadow-soft transition ${l.id === activeId ? "z-10 scale-110 bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent"}`}
        >
          {formatPrice(l.price, uiLocale)}
        </button>
      ))}
      {active && (
        <div
          className="absolute z-20 w-56 overflow-hidden rounded-2xl bg-card shadow-soft"
          style={{
            left: `min(calc(${active.x}% + 16px), calc(100% - 15rem))`,
            top: `min(calc(${active.y}% + 16px), calc(100% - 13rem))`,
          }}
        >
          <img src={active.image} alt={ui(active.title)} className="h-28 w-full object-cover" />
          <div className="p-3">
            <p className="text-sm font-semibold">{active.title}</p>
            <p className="text-sm font-bold text-primary">
              {formatPrice(active.price, uiLocale)}
              <span className="text-xs font-normal text-muted-foreground">{ui(" /month")}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
