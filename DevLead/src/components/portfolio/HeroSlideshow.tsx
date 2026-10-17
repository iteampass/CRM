import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeroSlide } from "@/lib/site-content";
import { slideImageUrl } from "@/lib/website-slides";
export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const { t: ui } = useI18n();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(query.matches);
    const changed = () => setPaused(query.matches);
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((i) => (i + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);
  const current = active % slides.length;
  const move = (delta: number) => {
    setPaused(true);
    setActive((current + delta + slides.length) % slides.length);
  };
  return (
    <>
      <div
        className="absolute inset-0 -z-20"
        role="region"
        aria-roledescription="carousel"
        aria-label={ui("Background slideshow")}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            aria-hidden={i !== current}
            className={`portfolio-slide absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${slide.path ? "portfolio-slide-uploaded" : ""} ${i === current ? "opacity-100" : "opacity-0"}`}
          >
            <img
              src={slideImageUrl(slide)}
              alt={ui(slide.alt)}
              width={1920}
              height={1024}
              fetchPriority={i === 0 ? "high" : "auto"}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sidebar-accent-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="bg-sidebar/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={ui("Previous slide")}
            title={ui("Previous slide")}
            onClick={() => move(-1)}
          >
            <ChevronLeft />
          </Button>
          <span
            className="w-12 text-center font-mono text-xs"
            aria-live={paused ? "polite" : "off"}
          >
            {current + 1} / {slides.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="bg-sidebar/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={ui("Next slide")}
            title={ui("Next slide")}
            onClick={() => move(1)}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-sidebar/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={ui(paused ? "Play slideshow" : "Pause slideshow")}
            title={ui(paused ? "Play slideshow" : "Pause slideshow")}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? <Play /> : <Pause />}
          </Button>
        </div>
      )}
    </>
  );
}
