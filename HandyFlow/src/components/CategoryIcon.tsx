import {
  Droplets,
  Zap,
  PaintRoller,
  Sofa,
  Hammer,
  Grid2x2,
  LayoutPanelTop,
  Wrench,
  Ruler,
  type LucideIcon,
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  Droplets,
  Zap,
  PaintRoller,
  Sofa,
  Hammer,
  Grid2x2,
  LayoutPanelTop,
  Wrench,
  Ruler,
};

export function getCategoryIcon(name: string): LucideIcon {
  return categoryIcons[name] ?? Wrench;
}
