import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import heroImage from "@/assets/hero-handyman.jpg";
import plumbingImage from "@/assets/plumber-under-sink.png";
import windowImage from "@/assets/window-repair.jpg";

const slides = [
  {
    src: heroImage,
    alt: "Handyman repairing a kitchen sink faucet",
    title: "Everyday repairs, expertly handled",
    service: "Kitchen plumbing",
    portrait: false,
  },
  {
    src: plumbingImage,
    alt: "Plumber repairing drain pipes beneath a kitchen sink",
    title: "Help where you need it",
    service: "Leaks and pipe repairs",
    portrait: false,
  },
  {
    src: windowImage,
    alt: "Professional adjusting an open window frame",
    title: "Make your home work better",
    service: "Window repairs and fitting",
    portrait: true,
  },
];

export function HeroSlideshow({ background = false }: { background?: boolean }) {
  const { t: tr, locale } = useI18n();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(motion.matches);
    const syncVisibility = () => setVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (paused || hovered || reducedMotion || !visible) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, [paused, hovered, reducedMotion, visible]);

  function choose(index: number) {
    setPaused(true);
    setActive((index + slides.length) % slides.length);
  }

  const controlClass =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

  return (
    <section
      aria-label={tr("Home repair photos")}
      aria-roledescription="carousel"
      className={background ? "absolute inset-0 min-w-0" : "surface-card min-w-0 overflow-hidden p-0"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target instanceof Element) || !event.target.closest("[data-rotation-control]"))
          setPaused(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          choose(active - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          choose(active + 1);
        }
      }}
    >
      <div className={background ? "h-full overflow-hidden" : "overflow-hidden"}>
        <div
          className={`flex transition-transform duration-700 ease-in-out motion-reduce:transition-none ${background ? "h-full" : ""}`}
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}: ${tr(slide.service)}`}
              aria-hidden={index !== active}
              className={`relative w-full shrink-0 overflow-hidden bg-muted ${background ? "h-full" : "aspect-[5/4]"}`}
            >
              {slide.portrait && !background && (
                <img
                  src={slide.src}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-xl"
                />
              )}
              <img
                src={slide.src}
                alt={tr(slide.alt)}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className={`relative h-full w-full ${slide.portrait && !background ? "object-contain" : "object-cover"}`}
              />
            </div>
          ))}
        </div>
      </div>
      <div className={background ? "absolute inset-x-0 bottom-5 z-20 flex justify-center" : "flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"}>
        <div className={background ? "hidden" : "min-w-0"}>
          <p className="text-xs font-medium text-brand">{tr(slides[active]?.service)}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{tr(slides[active]?.title)}</p>
        </div>
        <div className={`flex items-center gap-2 ${background ? "rounded-full bg-background/95 p-2 shadow-lg" : ""}`}>
          <button
            type="button"
            aria-label={tr("Previous photo")}
            className={controlClass}
            onClick={() => choose(active - 1)}
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex items-center" aria-label={tr("Choose a photo")}>
            {slides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`${tr("Show photo")} ${index + 1}: ${tr(slide.service)}`}
                aria-current={index === active ? "true" : undefined}
                className="flex size-7 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                onClick={() => choose(index)}
              >
                <span
                  className={`h-2 rounded-full transition-all ${index === active ? "w-5 bg-brand" : "w-2 bg-muted-foreground/40"}`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={tr("Next photo")}
            className={controlClass}
            onClick={() => choose(active + 1)}
          >
            <ChevronRight className="size-4" />
          </button>
          {!reducedMotion && (
            <button
              type="button"
              data-rotation-control
              aria-label={paused ? tr("Start photo rotation") : tr("Pause photo rotation")}
              className={controlClass}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
