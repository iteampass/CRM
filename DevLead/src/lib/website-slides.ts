import workspaceImage from "@/assets/ivan-workspace.jpg";
import type { HeroSlide } from "./site-content";

export const SLIDES_BUCKET = "website-slides";
export function slideImageUrl(slide: HeroSlide) {
  return slide.url || workspaceImage;
}