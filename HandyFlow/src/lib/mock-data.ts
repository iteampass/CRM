export type Role = "client" | "handyman";

export type TaskStatus =
  | "pending"
  | "negotiating"
  | "agreed"
  | "in_progress"
  | "completed";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  created_at: string;
  // handyman-only extras
  specialties?: string[];
  rating?: number;
  reviews?: number;
  location?: string;
  daily_rate?: number;
  available?: boolean;
  jobs_done?: number;
}

export interface RepairCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
  open_tasks: number;
}

export interface TaskRequest {
  id: string;
  client_id: string;
  handyman_id: string | null;
  category_id: string;
  title: string;
  description: string;
  location: string;
  preferred_date: string;
  status: TaskStatus;
  budget: number;
  created_at: string;
  updated_at: string;
}

export const statusLabels: Record<TaskStatus, string> = {
  pending: "Pending",
  negotiating: "Negotiating",
  agreed: "Agreed",
  in_progress: "In Progress",
  completed: "Completed",
};

export const categories: RepairCategory[] = [
  { id: "c1", name: "Plumbing", description: "Leaks, taps, pipes & boilers", icon: "Droplets", created_at: "2026-01-04", open_tasks: 12 },
  { id: "c2", name: "Electrical", description: "Sockets, lighting & wiring", icon: "Zap", created_at: "2026-01-04", open_tasks: 9 },
  { id: "c3", name: "Painting", description: "Walls, ceilings & touch-ups", icon: "PaintRoller", created_at: "2026-01-04", open_tasks: 7 },
  { id: "c4", name: "Furniture Assembly", description: "Flat-pack builds & fitting", icon: "Sofa", created_at: "2026-01-05", open_tasks: 5 },
  { id: "c5", name: "Carpentry", description: "Doors, shelving & woodwork", icon: "Hammer", created_at: "2026-01-05", open_tasks: 6 },
  { id: "c6", name: "Tiling", description: "Bathroom & kitchen tiling", icon: "Grid2x2", created_at: "2026-01-06", open_tasks: 4 },
  { id: "c7", name: "Drywall", description: "Patching, boarding & plaster", icon: "LayoutPanelTop", created_at: "2026-01-06", open_tasks: 3 },
  { id: "c8", name: "General Repairs", description: "Odd jobs around the home", icon: "Wrench", created_at: "2026-01-07", open_tasks: 14 },
  { id: "c9", name: "Minor Renovations", description: "Small remodels & upgrades", icon: "Ruler", created_at: "2026-01-07", open_tasks: 2 },
];

export const handymen: User[] = [
  { id: "h1", name: "Nina Ellis", email: "nina.ellis@cadre.io", avatar: "NE", role: "handyman", created_at: "2025-11-02", specialties: ["Plumbing", "Tiling"], rating: 4.3, reviews: 15, location: "Los Angeles, CA", daily_rate: 134, available: true, jobs_done: 68 },
  { id: "h2", name: "Newton Scamandar", email: "newton.s@cadre.io", avatar: "NS", role: "handyman", created_at: "2025-11-08", specialties: ["Electrical"], rating: 4.6, reviews: 22, location: "Los Angeles, CA", daily_rate: 148, available: false, jobs_done: 91 },
  { id: "h3", name: "Maverick Pandey", email: "maverick.p@cadre.io", avatar: "MP", role: "handyman", created_at: "2025-12-01", specialties: ["Carpentry", "Furniture Assembly"], rating: 4.1, reviews: 8, location: "Pasadena, CA", daily_rate: 120, available: true, jobs_done: 24 },
  { id: "h4", name: "Madison McKinsey", email: "madison.m@cadre.io", avatar: "MM", role: "handyman", created_at: "2025-12-11", specialties: ["Painting", "Drywall"], rating: 4.1, reviews: 5, location: "Santa Monica, CA", daily_rate: 112, available: true, jobs_done: 31 },
  { id: "h5", name: "Jesupe Jeiron", email: "jesupe.j@cadre.io", avatar: "JJ", role: "handyman", created_at: "2026-01-03", specialties: ["General Repairs"], rating: 4.0, reviews: 3, location: "Long Beach, CA", daily_rate: 98, available: false, jobs_done: 6 },
  { id: "h6", name: "Robin Heckinsey", email: "robin.h@cadre.io", avatar: "RH", role: "handyman", created_at: "2026-01-14", specialties: ["Minor Renovations", "Tiling"], rating: 3.2, reviews: 5, location: "Los Angeles, CA", daily_rate: 165, available: true, jobs_done: 12 },
];

export const clients: User[] = [
  { id: "u1", name: "Jaison Alexander", email: "jaison@mail.com", avatar: "JA", role: "client", created_at: "2025-10-19", location: "Sector 23, Los Angeles, CA" },
  { id: "u2", name: "Priya Raman", email: "priya.r@mail.com", avatar: "PR", role: "client", created_at: "2025-11-22", location: "Culver City, CA" },
  { id: "u3", name: "Tom Whitaker", email: "tom.w@mail.com", avatar: "TW", role: "client", created_at: "2025-12-04", location: "Glendale, CA" },
  { id: "u4", name: "Elena Vasquez", email: "elena.v@mail.com", avatar: "EV", role: "client", created_at: "2026-01-09", location: "Inglewood, CA" },
  { id: "u5", name: "Marcus Boyd", email: "marcus.b@mail.com", avatar: "MB", role: "client", created_at: "2026-02-01", location: "Burbank, CA" },
];

export const tasks: TaskRequest[] = [
  { id: "t1", client_id: "u1", handyman_id: null, category_id: "c1", title: "Kitchen sink leaking under cabinet", description: "Water pooling under the sink after every wash cycle. Needs a new trap and seal.", location: "Sector 23, Los Angeles, CA", preferred_date: "2026-09-04", status: "pending", budget: 160, created_at: "2026-08-28", updated_at: "2026-08-28" },
  { id: "t2", client_id: "u2", handyman_id: "h2", category_id: "c2", title: "Install 4 ceiling spotlights", description: "Living room ceiling, wiring already run. Need fixtures mounted and tested.", location: "Culver City, CA", preferred_date: "2026-09-06", status: "negotiating", budget: 320, created_at: "2026-08-27", updated_at: "2026-08-30" },
  { id: "t3", client_id: "u3", handyman_id: "h4", category_id: "c3", title: "Repaint hallway and stairwell", description: "Two coats, off-white. Some filling needed around the skirting boards.", location: "Glendale, CA", preferred_date: "2026-09-02", status: "agreed", budget: 540, created_at: "2026-08-24", updated_at: "2026-08-29" },
  { id: "t4", client_id: "u4", handyman_id: "h3", category_id: "c4", title: "Assemble wardrobe & bed frame", description: "Two flat-pack items delivered, all parts on site.", location: "Inglewood, CA", preferred_date: "2026-09-01", status: "in_progress", budget: 210, created_at: "2026-08-21", updated_at: "2026-08-31" },
  { id: "t5", client_id: "u5", handyman_id: "h1", category_id: "c6", title: "Retile shower enclosure", description: "Old tiles removed already, roughly 4 sqm of new tiling and grouting.", location: "Burbank, CA", preferred_date: "2026-08-26", status: "completed", budget: 780, created_at: "2026-08-10", updated_at: "2026-08-26" },
  { id: "t6", client_id: "u1", handyman_id: "h6", category_id: "c9", title: "Convert alcove into storage nook", description: "Small renovation: framing, boarding and a fitted shelf unit.", location: "Sector 23, Los Angeles, CA", preferred_date: "2026-09-11", status: "negotiating", budget: 1250, created_at: "2026-08-26", updated_at: "2026-08-31" },
  { id: "t7", client_id: "u2", handyman_id: null, category_id: "c8", title: "Fix squeaking bedroom door", description: "Door drags on the frame and the hinge squeaks badly.", location: "Culver City, CA", preferred_date: "2026-09-03", status: "pending", budget: 70, created_at: "2026-08-30", updated_at: "2026-08-30" },
  { id: "t8", client_id: "u3", handyman_id: "h5", category_id: "c7", title: "Patch ceiling water damage", description: "Roughly 1 sqm of damaged plasterboard in the spare room ceiling.", location: "Glendale, CA", preferred_date: "2026-09-08", status: "agreed", budget: 290, created_at: "2026-08-25", updated_at: "2026-08-30" },
  { id: "t9", client_id: "u4", handyman_id: "h1", category_id: "c1", title: "Replace bathroom mixer tap", description: "Tap supplied by client, old one is seized.", location: "Inglewood, CA", preferred_date: "2026-08-29", status: "completed", budget: 130, created_at: "2026-08-14", updated_at: "2026-08-29" },
  { id: "t10", client_id: "u5", handyman_id: "h3", category_id: "c5", title: "Build fitted bookshelf", description: "Alcove shelving, painted MDF, five shelves.", location: "Burbank, CA", preferred_date: "2026-09-05", status: "in_progress", budget: 660, created_at: "2026-08-19", updated_at: "2026-08-31" },
  { id: "t11", client_id: "u1", handyman_id: null, category_id: "c2", title: "Two dead sockets in home office", description: "Both stopped working the same day, breaker is fine.", location: "Sector 23, Los Angeles, CA", preferred_date: "2026-09-02", status: "pending", budget: 180, created_at: "2026-08-31", updated_at: "2026-08-31" },
  { id: "t12", client_id: "u2", handyman_id: "h4", category_id: "c3", title: "Touch up scuffed living room walls", description: "Paint available on site, mostly around the sofa wall.", location: "Culver City, CA", preferred_date: "2026-08-27", status: "completed", budget: 150, created_at: "2026-08-12", updated_at: "2026-08-27" },
];

export const usersById: Record<string, User> = Object.fromEntries(
  [...handymen, ...clients].map((u) => [u.id, u]),
);

export const categoriesById: Record<string, RepairCategory> = Object.fromEntries(
  categories.map((c) => [c.id, c]),
);

export function countByStatus(status: TaskStatus) {
  return tasks.filter((t) => t.status === status).length;
}

export const statusOrder: TaskStatus[] = [
  "pending",
  "negotiating",
  "agreed",
  "in_progress",
  "completed",
];

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
