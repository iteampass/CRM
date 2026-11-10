import { arrivalProposalMode } from "./arrival-proposal";
import { sameCountry, scopeHandymanCountry } from "@/lib/workspace-country";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Tone = "blue" | "violet" | "amber" | "green" | "coral";

const TONES: Tone[] = ["blue", "violet", "amber", "green", "coral"];
const toneAt = (i: number): Tone => TONES[i % TONES.length]!;

export interface TakenRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  agreedPrice: number | null;
  rated: boolean;
  client: string;
  category: string;
  handyman: string;
  due: string;
  priority: string;
  progress: number;
  status: "To do" | "In progress" | "Done";
  tone: Tone;
  initials: string;
}

export interface RequestOffer {
  id: string;
  price: number;
  message: string;
  status: string;
  handyman: string;
  mine: boolean;
}

export interface OpenRequest {
  id: string;
  title: string;
  description: string;
  client: string;
  location: string;
  category: string;
  deadline: string;
  budget: string;
  priority: string;
  labels: string[];
  tone: Tone;
  initials: string;
  status: string;
  clientCountry: string;
  takenByMe: boolean;
  assigned: boolean;
  mineAsClient: boolean;
  cancelRequestedByMe: boolean;
  cancelRequested: boolean;
  postponedTo: string | null;
  postponeRequestedDate: string | null;
  postponeRequestedTime: string | null;
  postponeRequestedByMe: boolean;
  postponeRequested: boolean;
  postponeReason: string;
  arrivalDate: string | null;
  arrivalTime: string | null;
  offers: RequestOffer[];
}


export interface ScheduleTask {
  time: string;
  title: string;
  client: string;
  handyman: string;
  category: string;
  location: string;
  status: string;
  iso: string;
  tone: Tone;
}

export interface ScheduleDay {
  day: string;
  date: string;
  full: string;
  iso: string;
  tasks: ScheduleTask[];
}


export interface HandymanEntry {
  id: string;
  name: string;
  role: string;
  rating: string;
  jobs: number;
  rate: string;
  initials: string;
  available: boolean;
  tone: Tone;
  bio: string;
  location: string;
  specialties: string[];
  reviews: number;
}

export interface Viewer {
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  email: string;
  role: "client" | "handyman" | "admin";
  address: string;
  street: string;
  streetNumber: string;
  floor: string;
  zipCode: string;
  city: string;
  country: string;
  countryCode: string;
  phones: string[];
  isPublic: boolean;
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
  nickname: string;
  headline: string;
  bio: string;
  location: string;
  specialties: string[];
  dailyRate: number | null;
  available: boolean;
}

export interface PaymentEntry {
  id: string;
  title: string;
  category: string;
  date: string;
  counterparty: string;
  amount: number;
  direction: "paid" | "charged";
}

export interface FeedbackEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  rating: number;
  comment: string;
  direction: "client_to_handyman" | "handyman_to_client";
  authorName: string;
  authorInitials: string;
  targetName: string;
  mine: boolean;
  createdAt: string;
}


export interface WorkspaceData {
  hasClientRequests: boolean;
  viewer: Viewer;
  stats: { activeRequests: number; availableHandymen: number; activeProjects: number; completed: number };
  takenRequests: TakenRequest[];
  clientTasks: TakenRequest[];
  openRequests: OpenRequest[];
  archivedRequests: OpenRequest[];
  payments: PaymentEntry[];
  scheduleDays: ScheduleDay[];
  scheduleTasks: ScheduleTask[];
  feedback: FeedbackEntry[];

  handymen: HandymanEntry[];
  handymenTotal: number;
  handymenAvailable: number;
  weekLabel: string;
}

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : "";
}

function boardStatus(status: string): "To do" | "In progress" | "Done" {
  if (status === "completed") return "Done";
  if (status === "in_progress") return "In progress";
  return "To do";
}

export const getWorkspaceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkspaceData> => {
    const { supabase, userId } = context;

    const [tasksRes, crewRes, meRes] = await Promise.all([
      supabase
        .from("task_requests")
        .select(
          "id, title, description, location, preferred_date, status, budget, budget_max, agreed_price, updated_at, priority, progress, start_time, end_time, handyman_id, client_id, cancel_requested_by, postponed_to, postpone_requested_by, postpone_requested_date, postpone_requested_time, postpone_reason, client:profile_directory!task_requests_client_id_fkey(name, avatar, country_code), handyman:profile_directory!task_requests_handyman_id_fkey(name, avatar), category:repair_categories(name)",
        )
        .order("preferred_date", { ascending: true }),
      supabase
        .from("profile_directory")
        .select("id, name, avatar, headline, rating, reviews_count, jobs_done, daily_rate, available, country_code, bio, location, specialties, city, country")
        .not("headline", "is", null)
        .eq("is_public", true)
        .order("jobs_done", { ascending: false }),
      supabase
        .from("profiles")
        .select(
          "name, first_name, last_name, avatar, email, address, phones, is_public, avatar_url, street, street_number, floor, zip_code, city, country, country_code, latitude, longitude, formatted_address, nickname, headline, bio, location, specialties, daily_rate, available",
        )
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const rolesRes = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (rolesRes.error) throw rolesRes.error;
    if (meRes.error) throw meRes.error;
    const roles = (rolesRes.data ?? []).map((r) => r.role);
    const viewerRole = roles.includes("admin")
      ? ("admin" as const)
      : roles.includes("handyman")
        ? ("handyman" as const)
        : ("client" as const);

    let avatarUrl: string | null = null;
    if (meRes.data?.avatar_url) {
      const signed = await supabase.storage
        .from("handyflow-avatars")
        .createSignedUrl(meRes.data.avatar_url, 60 * 60);
      avatarUrl = signed.data?.signedUrl ?? null;
    }

    if (tasksRes.error) throw tasksRes.error;
    if (crewRes.error) throw crewRes.error;

    const viewerCountry = meRes.data?.country_code ?? "";
    // Scope the source rows before computing lists, totals, schedule or payments.
    const allRows = scopeHandymanCountry(
      tasksRes.data ?? [], viewerRole, viewerCountry, (request) => request.client?.country_code,
    );
    // Clients only ever see the requests they created themselves.
    const rows =
      viewerRole === "client" ? allRows.filter((r) => r.client_id === userId) : allRows;
    const crew = (crewRes.data ?? []).filter((p) => {
      if (viewerRole === "admin") return true;
      if (viewerRole === "client" && !viewerCountry) return true;
      return sameCountry(viewerCountry, p.country_code);
    });

    // Completed/cancelled jobs are only shown to actual participants (the
    // client or the assigned handyman). Demo rows are readable by RLS for
    // everyone, so without this a handyman would see other people's finished
    // demo tasks in their feedback panel, schedule and "completed" stats.
    const isParticipant = (r: (typeof rows)[number]) =>
      r.client_id === userId || r.handyman_id === userId;
    const taken = rows.filter(
      (r) =>
        r.handyman_id &&
        (isParticipant(r) || (r.status !== "completed" && r.status !== "cancelled")),
    );
    const isDone = (s: string) => s === "completed" || s === "cancelled";
    // Handyman source rows are already scoped to the profile country above.
    const open =
      viewerRole === "client"
        ? rows.filter((r) => !isDone(r.status))
        : rows
            .filter((r) => !isDone(r.status))
            .filter((r) => !r.handyman_id || r.handyman_id === userId);
    // Archive only the viewer’s completed/cancelled requests; rows are already country-scoped.
    const archived = rows.filter((r) => isDone(r.status) && isParticipant(r));

    const offersRes = await supabase
      .from("offers")
      .select(
        "id, task_id, price, message, status, handyman_id, handyman:profile_directory!offers_handyman_id_fkey(name)",
      )
      .in("task_id", [...open, ...archived].map((r) => r.id))
      .order("created_at", { ascending: true });
    const offerRows = offersRes.data ?? [];

    // Reviews on tasks the viewer took part in.
    const takenIds = taken.map((r) => r.id);
    const reviewsRes = takenIds.length
      ? await supabase
          .from("reviews")
          .select(
            "id, task_id, rating, comment, direction, reviewer_id, client_id, handyman_id, created_at, client:profile_directory!reviews_client_id_fkey(name, avatar), handyman:profile_directory!reviews_handyman_id_fkey(name, avatar)",
          )
          .in("task_id", takenIds)
          .order("created_at", { ascending: false })
      : { data: [] as any[] };
    const reviewRows = (reviewsRes.data ?? []) as any[];
    const ratedIds = new Set(
      reviewRows.filter((r) => r.reviewer_id === userId).map((r) => r.task_id as string),
    );
    const taskTitle = new Map(taken.map((r) => [r.id, r.title]));
    const feedback: FeedbackEntry[] = reviewRows.map((r) => {
      const toHandyman = r.direction !== "handyman_to_client";
      const authorName = (toHandyman ? r.client?.name : r.handyman?.name) ?? "Someone";
      const targetName = (toHandyman ? r.handyman?.name : r.client?.name) ?? "Someone";
      return {
        id: r.id as string,
        taskId: r.task_id as string,
        taskTitle: taskTitle.get(r.task_id) ?? "Completed project",
        rating: Number(r.rating),
        comment: String(r.comment ?? ""),
        direction: toHandyman ? "client_to_handyman" : "handyman_to_client",
        authorName,
        authorInitials: initialsOf(authorName),
        targetName,
        mine: r.reviewer_id === userId,
        createdAt: String(r.created_at),
      };
    });


    const takenRequests: TakenRequest[] = taken.map((r, i) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      location: r.location,
      agreedPrice: r.agreed_price != null ? Number(r.agreed_price) : null,
      rated: ratedIds.has(r.id),
      client: r.client?.name ?? "Unknown client",
      category: r.category?.name ?? "General",
      handyman: r.handyman?.name ?? "Unassigned",
      due: `${fmtDate(r.preferred_date ?? isoDate(new Date()))}${r.start_time ? `, ${fmtTime(r.start_time)}` : ""}`,
      priority: r.priority,
      progress: r.progress,
      status: boardStatus(r.status),
      tone: toneAt(i),
      initials: r.client?.avatar ?? initialsOf(r.client?.name ?? "NA"),
    }));

    const toOpenRequest = (r: (typeof rows)[number], i: number): OpenRequest => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      clientCountry: r.client?.country_code ?? "",
      client: r.client?.name ?? "Unknown client",
      location: r.location,
      category: r.category?.name ?? "General",
      deadline: fmtDate(r.preferred_date ?? isoDate(new Date())),
      budget: r.budget_max ? `$${r.budget}–$${r.budget_max}` : `$${r.budget ?? 0}`,
      priority: r.priority,
      labels: [r.category?.name ?? "General", r.location.split(",")[0]!.trim()],
      tone: toneAt(i),
      initials: r.client?.avatar ?? initialsOf(r.client?.name ?? "NA"),
      takenByMe: r.handyman_id === userId,
      assigned: Boolean(r.handyman_id),
      mineAsClient: r.client_id === userId,
      cancelRequestedByMe: r.cancel_requested_by === userId,
      cancelRequested: Boolean(r.cancel_requested_by),
      postponedTo: r.postponed_to ?? null,
      postponeRequestedDate: r.postpone_requested_date ?? null,
      postponeRequestedTime: r.postpone_requested_time ?? null,
      arrivalDate: r.postponed_to ?? r.preferred_date ?? null,
      arrivalTime: r.start_time ?? null,
      postponeRequestedByMe: r.postpone_requested_by === userId,
      postponeRequested: Boolean(r.postpone_requested_by),
      postponeReason: r.postpone_reason ?? "",
      offers: offerRows
        .filter((o) => o.task_id === r.id)
        .map((o) => ({
          id: o.id,
          price: Number(o.price),
          message: o.message,
          status: o.status,
          handyman: o.handyman?.name ?? "Handyman",
          mine: o.handyman_id === userId,
        })),
    });


    const openRequests: OpenRequest[] = open.map(toOpenRequest);
    const archivedRequests: OpenRequest[] = archived.map(toOpenRequest);

    // Client menu for handymen: unassigned requests from same-country clients,
    // plus every task (active or completed) assigned to the current handyman.
    const clientTaskRows =
      viewerRole === "handyman"
        ? rows.filter(
            (r) =>
              r.handyman_id === userId ||
              (!r.handyman_id &&
                (!viewerCountry || (r.client?.country_code ?? "") === viewerCountry)),
          )
        : taken;
    const clientTasks: TakenRequest[] = clientTaskRows.map((r, i) => ({
      ...takenRequests.find((t) => t.id === r.id) ?? {
        id: r.id,
        title: r.title,
        description: r.description,
        location: r.location,
        agreedPrice: r.agreed_price != null ? Number(r.agreed_price) : null,
        rated: ratedIds.has(r.id),
        client: r.client?.name ?? "Unknown client",
        category: r.category?.name ?? "General",
        handyman: r.handyman?.name ?? "Unassigned",
        due: `${fmtDate(r.preferred_date ?? isoDate(new Date()))}${r.start_time ? `, ${fmtTime(r.start_time)}` : ""}`,
        priority: r.priority,
        progress: r.progress,
        status: boardStatus(r.status),
        tone: toneAt(i),
        initials: r.client?.avatar ?? initialsOf(r.client?.name ?? "NA"),
      },
    }));

    // Finance history: agreed prices on completed tasks.
    const payments: PaymentEntry[] = allRows
      .filter((r) => r.status === "completed" && r.agreed_price != null)
      .filter((r) => r.client_id === userId || r.handyman_id === userId)
      .flatMap((r) => {
        const base = {
          title: r.title,
          category: r.category?.name ?? "General",
          date: fmtDate((r.updated_at ?? r.preferred_date ?? isoDate(new Date())).slice(0, 10)),
          amount: Number(r.agreed_price),
        };
        const entries: PaymentEntry[] = [];
        if (r.client_id === userId)
          entries.push({
            ...base,
            id: `${r.id}-paid`,
            counterparty: r.handyman?.name ?? "Handyman",
            direction: "paid",
          });
        if (r.handyman_id === userId)
          entries.push({
            ...base,
            id: `${r.id}-charged`,
            counterparty: r.client?.name ?? "Client",
            direction: "charged",
          });
        return entries;
      });

    // Current week (Mon–Sun)
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const offset = (today.getUTCDay() + 6) % 7;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - offset);

    // Every scheduled (agreed / in progress / completed) task, any date.
    const scheduleTasks: ScheduleTask[] = taken
      .filter((r) => r.status !== "cancelled" && (r.postponed_to || r.preferred_date))
      .map((r, idx) => ({
        time: r.start_time ? `${fmtTime(r.start_time)}–${fmtTime(r.end_time)}` : "All day",
        title: r.title,
        client: r.client?.name ?? "Unknown client",
        handyman: r.handyman?.name ?? "Unassigned",
        category: r.category?.name ?? "General",
        location: r.location ?? "",
        status: boardStatus(r.status),
        iso: (r.postponed_to ?? r.preferred_date)!,
        tone: toneAt(idx),
      }))
      .sort((a, b) => a.iso.localeCompare(b.iso));

    const scheduleDays: ScheduleDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const iso = isoDate(d);
      return {
        day: DAY_SHORT[i]!,
        date: iso.slice(8, 10),
        full: DAY_FULL[i]!,
        iso,
        tasks: scheduleTasks.filter((t) => t.iso === iso),
      };
    });


    const handymen: HandymanEntry[] = crew.map((p, i) => ({
      id: p.id,
      name: p.name,
      role: p.headline ?? "Handyman",
      rating: Number(p.rating ?? 0).toFixed(1),
      jobs: p.jobs_done,
      rate: `$${Math.round(Number(p.daily_rate ?? 0))}/day`,
      initials: p.avatar ?? initialsOf(p.name),
      available: p.available,
      tone: toneAt(i),
      bio: p.bio ?? "",
      location: p.location || [p.city, p.country].filter(Boolean).join(", "),
      specialties: p.specialties ?? [],
      reviews: p.reviews_count ?? 0,
    }));

    const viewerName = meRes.data?.name || "there";

    return {
      viewer: {
        name: viewerName,
        firstName: meRes.data?.first_name ?? "",
        lastName: meRes.data?.last_name ?? "",
        initials: meRes.data?.avatar ?? initialsOf(viewerName),
        email: meRes.data?.email ?? "",
        role: viewerRole,
        address: meRes.data?.address ?? "",
        street: meRes.data?.street ?? "",
        streetNumber: meRes.data?.street_number ?? "",
        floor: meRes.data?.floor ?? "",
        zipCode: meRes.data?.zip_code ?? "",
        city: meRes.data?.city ?? "",
        country: meRes.data?.country ?? "",
        countryCode: meRes.data?.country_code ?? "",
        phones: meRes.data?.phones ?? [],
        isPublic: meRes.data?.is_public ?? true,
        avatarUrl,
        latitude: meRes.data?.latitude ?? null,
        longitude: meRes.data?.longitude ?? null,
        formattedAddress: meRes.data?.formatted_address ?? "",
        nickname: meRes.data?.nickname ?? "",
        headline: meRes.data?.headline ?? "",
        bio: meRes.data?.bio ?? "",
        location: meRes.data?.location ?? "",
        specialties: meRes.data?.specialties ?? [],
        dailyRate: meRes.data?.daily_rate != null ? Number(meRes.data.daily_rate) : null,
        available: meRes.data?.available ?? true,
      },
      hasClientRequests: (tasksRes.data ?? []).some((request) => request.client_id === userId),
      stats: {
        activeRequests: open.length,
        availableHandymen: crew.filter((p) => p.available).length,
        activeProjects: taken.filter((r) => r.status !== "completed" && r.status !== "cancelled").length,
        completed: rows.filter((r) => r.status === "completed" && isParticipant(r)).length,
      },
      takenRequests,
      clientTasks,
      openRequests,
      archivedRequests,
      payments,
      scheduleDays,
      scheduleTasks,
      feedback,

      handymen,
      handymenTotal: crew.length,
      handymenAvailable: crew.filter((p) => p.available).length,
      weekLabel: `${fmtDate(scheduleDays[0]!.iso).replace(`, ${scheduleDays[0]!.iso.slice(0, 4)}`, "")} – ${fmtDate(scheduleDays[6]!.iso)}`,
    };
  });

export const getRepairCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("repair_categories")
      .select("id, name")
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export interface CreateRequestInput {
  title: string;
  categoryId: string;
  description: string;
  location: string;
  preferredDate: string;
  budget: number;
  budgetMax?: number;
  priority: string;
}

export const createTaskRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateRequestInput) => {
    const title = String(data?.title ?? "").trim();
    if (!title) throw new Error("Title is required");
    if (!data?.categoryId) throw new Error("Pick a category");
    if (!data?.preferredDate) throw new Error("Pick a preferred date");
    const budget = Number(data?.budget);
    if (!Number.isFinite(budget) || budget < 0) throw new Error("Enter a valid budget");
    const budgetMax = data?.budgetMax != null ? Number(data.budgetMax) : undefined;
    return {
      title,
      categoryId: String(data.categoryId),
      description: String(data?.description ?? "").trim(),
      location: String(data?.location ?? "").trim(),
      preferredDate: String(data.preferredDate),
      budget,
      budgetMax: budgetMax != null && Number.isFinite(budgetMax) ? budgetMax : undefined,
      priority: ["Low", "Medium", "High", "Urgent"].includes(String(data?.priority))
        ? String(data.priority)
        : "Medium",
    };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("task_requests").insert({
      client_id: context.userId,
      category_id: data.categoryId,
      title: data.title,
      description: data.description,
      location: data.location,
      preferred_date: data.preferredDate,
      budget: data.budget,
      budget_max: data.budgetMax ?? null,
      priority: data.priority,
      status: "pending",
    });
    if (error) throw error;
    return { ok: true };
  });

export interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
  name: string;
  street: string;
  streetNumber: string;
  floor: string;
  zipCode: string;
  city: string;
  country: string;
  countryCode: string;
  phones: string[];
  isPublic: boolean;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  avatarPath?: string | null;
  nickname?: string;
  headline?: string;
  bio?: string;
  location?: string;
  specialties?: string[];
  dailyRate?: number | null;
  available?: boolean;
}

function composeAddress(a: {
  street: string;
  streetNumber: string;
  floor: string;
  zipCode: string;
  city: string;
  country: string;
}) {
  const line1 = [a.street, a.streetNumber].filter(Boolean).join(" ");
  const floor = a.floor ? `Floor ${a.floor}` : "";
  const line2 = [a.zipCode, a.city].filter(Boolean).join(" ");
  return [line1, floor, line2, a.country].filter(Boolean).join(", ");
}

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ProfileUpdateInput) => {
    const firstName = String(data?.firstName ?? "").trim();
    const lastName = String(data?.lastName ?? "").trim();
    const name = [firstName, lastName].filter(Boolean).join(" ") || String(data?.name ?? "").trim();
    if (!name) throw new Error("Name is required");
    const phones = (data?.phones ?? [])
      .map((p) => String(p).trim())
      .filter(Boolean)
      .slice(0, 3);
    const s = (v: unknown) => String(v ?? "").trim();
    return {
      firstName,
      lastName,
      name,
      street: s(data?.street),
      streetNumber: s(data?.streetNumber),
      floor: s(data?.floor),
      zipCode: s(data?.zipCode),
      city: s(data?.city),
      country: s(data?.country),
      countryCode: s(data?.countryCode),
      phones,
      isPublic: Boolean(data?.isPublic),
      latitude: typeof data?.latitude === "number" ? data.latitude : null,
      longitude: typeof data?.longitude === "number" ? data.longitude : null,
      formattedAddress: data?.formattedAddress ? String(data.formattedAddress) : null,
      avatarPath: data?.avatarPath ?? undefined,
      nickname: s(data?.nickname),
      headline: s(data?.headline),
      bio: s(data?.bio),
      location: s(data?.location),
      specialties: (data?.specialties ?? []).map((v) => String(v).trim()).filter(Boolean).slice(0, 10),
      dailyRate: typeof data?.dailyRate === "number" && data.dailyRate >= 0 ? data.dailyRate : null,
      available: Boolean(data?.available),
    };
  })
  .handler(async ({ context, data }) => {
    const patch: {
      name: string
      first_name: string | null
      last_name: string | null
      address: string | null
      street: string | null
      street_number: string | null
      floor: string | null
      zip_code: string | null
      city: string | null
      country: string | null
      country_code: string | null
      phones: string[]
      is_public: boolean
      latitude: number | null
      longitude: number | null
      formatted_address: string | null
      avatar: string
      avatar_url?: string | null
      nickname: string | null
      headline: string | null
      bio: string | null
      location: string | null
      specialties: string[]
      daily_rate: number | null
      available: boolean
    } = {
      name: data.name,
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      address: composeAddress(data) || null,
      street: data.street || null,
      street_number: data.streetNumber || null,
      floor: data.floor || null,
      zip_code: data.zipCode || null,
      city: data.city || null,
      country: data.country || null,
      country_code: data.countryCode || null,
      phones: data.phones,
      is_public: data.isPublic,
      latitude: data.latitude,
      longitude: data.longitude,
      formatted_address: data.formattedAddress,
      avatar: initialsOf(data.name),
      nickname: data.nickname || null,
      headline: data.headline || null,
      bio: data.bio || null,
      location: data.location || null,
      specialties: data.specialties,
      daily_rate: data.dailyRate,
      available: data.available,
    };
    if (data.avatarPath !== undefined) patch['avatar_url'] = data.avatarPath;

    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const TASK_FLOW = ["pending", "negotiating", "agreed", "in_progress", "completed"] as const;
export type TaskStatusValue = (typeof TASK_FLOW)[number];

export function nextStatus(current: string): TaskStatusValue | null {
  const i = TASK_FLOW.indexOf(current as TaskStatusValue);
  if (i < 0 || i >= TASK_FLOW.length - 1) return null;
  return TASK_FLOW[i + 1]!;
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  negotiating: "Negotiating",
  agreed: "Agreed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const FREE_PLAN_MONTHLY_TAKE_LIMIT = 5;

export const takeTaskRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    return { taskId: String(data.taskId) };
  })
  .handler(async ({ context, data }) => {
    const { data: isHandyman } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "handyman",
    });
    if (!isHandyman) throw new Error("Only handymen can do this");

    // Free plan: max 5 taken requests per calendar month
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { count: takenThisMonth, error: countError } = await context.supabase
      .from("task_events")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", context.userId)
      .eq("type", "taken")
      .gte("created_at", monthStart);
    if (countError) throw countError;
    if ((takenThisMonth ?? 0) >= FREE_PLAN_MONTHLY_TAKE_LIMIT) {
      throw new Error(
        `Free plan limit reached — you can take ${FREE_PLAN_MONTHLY_TAKE_LIMIT} requests per month. Upgrade to take more.`,
      );
    }

    const { data: claimed, error } = await context.supabase
      .from("task_requests")
      .update({ handyman_id: context.userId, status: "pending" })
      .eq("id", data.taskId)
      .is("handyman_id", null)
      .select("id");

    if (error) throw error;
    if (!claimed || claimed.length === 0) {
      throw new Error("This request was already taken by another handyman");
    }

    await logTaskEvent(context.supabase, {
      taskId: data.taskId,
      actorId: context.userId,
      actorRole: "handyman",
      type: "taken",
      message: "Handyman took the request",
    });
    return { ok: true };
  });

export const advanceTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string; status: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    if (!TASK_FLOW.includes(data?.status as TaskStatusValue)) throw new Error("Invalid status");
    return { taskId: String(data.taskId), status: data.status as TaskStatusValue };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("task_requests")
      .update({
        status: data.status,
        ...(data.status === "in_progress" ? { progress: 25 } : {}),
        ...(data.status === "completed" ? { progress: 100 } : {}),
      })
      .eq("id", data.taskId);
    if (error) throw error;
    await logTaskEvent(context.supabase, {
      taskId: data.taskId,
      actorId: context.userId,
      actorRole: "participant",
      type: "status",
      message: `Status changed to ${STATUS_LABELS[data.status] ?? data.status}`,
    });
    return { ok: true };
  });

export const createOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string; price: number; message?: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    const price = Number(data?.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a valid price");
    return { taskId: String(data.taskId), price, message: String(data?.message ?? "").trim() };
  })
  .handler(async ({ context, data }) => {
    const { data: isHandyman } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "handyman",
    });
    if (!isHandyman) throw new Error("Only handymen can do this");
    const { error } = await context.supabase.from("offers").insert({
      task_id: data.taskId,
      handyman_id: context.userId,
      price: data.price,
      message: data.message,
      status: "pending",
    });
    if (error) throw error;
    // An offer moves the request into negotiation for the client.
    await context.supabase
      .from("task_requests")
      .update({ status: "negotiating" })
      .eq("id", data.taskId)
      .eq("handyman_id", context.userId)
      .eq("status", "pending");
    await logTaskEvent(context.supabase, {
      taskId: data.taskId,
      actorId: context.userId,
      actorRole: "handyman",
      type: "offer_sent",
      message: data.message ? `Offer sent — ${data.message}` : "Offer sent",
      price: data.price,
    });
    return { ok: true };
  });

export const acceptOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { offerId: string }) => {
    if (!data?.offerId) throw new Error("Missing offer");
    return { offerId: String(data.offerId) };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("resolve_offer", {
      _offer_id: data.offerId,
      _action: "accept",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Client rejects an offer.
 *  - "decline"  → offer declined, request released back to its first state (unassigned, pending)
 *  - "another"  → offer declined, handyman keeps the request and can send a new offer
 */
export const rejectOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { offerId: string; mode: "decline" | "another" }) => {
    if (!data?.offerId) throw new Error("Missing offer");
    const mode = data?.mode === "another" ? "another" : "decline";
    return { offerId: String(data.offerId), mode: mode as "decline" | "another" };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("resolve_offer", {
      _offer_id: data.offerId,
      _action: data.mode,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Handyman withdraws their own pending offer; the request returns to its first status. */
export const withdrawOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { offerId: string }) => {
    if (!data?.offerId) throw new Error("Missing offer");
    return { offerId: String(data.offerId) };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("resolve_offer", {
      _offer_id: data.offerId,
      _action: "withdraw",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string; rating: number; comment?: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    const rating = Number(data?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new Error("Rating must be between 1 and 5");
    return {
      taskId: String(data.taskId),
      rating,
      comment: String(data?.comment ?? "").trim(),
    };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: task, error: taskErr } = await supabase
      .from("task_requests")
      .select("id, client_id, handyman_id, status")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw taskErr;
    if (!task) throw new Error("Request not found");
    if (task.status !== "completed") throw new Error("You can rate only completed tasks");
    if (!task.handyman_id) throw new Error("No handyman assigned to this task");
    const isClient = task.client_id === userId;
    const isHandyman = task.handyman_id === userId;
    if (!isClient && !isHandyman) throw new Error("Only project participants can leave feedback");

    const { error } = await supabase.from("reviews").insert({
      task_id: data.taskId,
      client_id: task.client_id,
      handyman_id: task.handyman_id,
      reviewer_id: userId,
      direction: isClient ? "client_to_handyman" : "handyman_to_client",
      rating: data.rating,
      comment: data.comment,

    });
    if (error) throw error;
    return { ok: true };
  });


// ---------------------------------------------------------------------------
// Negotiation / activity log
// ---------------------------------------------------------------------------

export interface TaskLogEntry {
  id: string;
  type: string;
  message: string;
  price: number | null;
  actor: string;
  actorRole: string;
  createdAt: string;
}

function whenLabel(date: string, time?: string | null) {
  return time ? `${date} at ${time.slice(0, 5)}` : date;
}

type LogClient = { from: (t: "task_events") => any };

async function logTaskEvent(
  supabase: LogClient,
  entry: {
    taskId: string;
    actorId: string;
    actorRole: string;
    type: string;
    message: string;
    price?: number | null;
  },
) {
  try {
    await supabase.from("task_events").insert({
      task_id: entry.taskId,
      actor_id: entry.actorId,
      actor_role: entry.actorRole,
      type: entry.type,
      message: entry.message,
      price: entry.price ?? null,
    });
  } catch {
    // logging must never break the action itself
  }
}

export const getTaskLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    return { taskId: String(data.taskId) };
  })
  .handler(async ({ context, data }): Promise<TaskLogEntry[]> => {
    const { data: rows, error } = await context.supabase
      .from("task_events")
      .select("id, type, message, price, actor_role, created_at, actor:profile_directory(name)")
      .eq("task_id", data.taskId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      message: r.message,
      price: r.price != null ? Number(r.price) : null,
      actor: (r as { actor?: { name?: string } | null }).actor?.name ?? "Someone",
      actorRole: r.actor_role,
      createdAt: r.created_at,
    }));
  });

/**
 * Cancel a request.
 *  - Client, before the price is agreed → cancelled immediately.
 *  - After "agreed" → both sides must confirm; the first call records the request,
 *    the other side's call performs the cancellation.
 */
export const cancelTaskRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string; reason?: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    return { taskId: String(data.taskId), reason: String(data?.reason ?? "").trim() };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: task, error: taskErr } = await supabase
      .from("task_requests")
      .select("id, client_id, handyman_id, status, cancel_requested_by")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw taskErr;
    if (!task) throw new Error("Request not found");

    const isClient = task.client_id === userId;
    const isHandyman = task.handyman_id === userId;
    if (!isClient && !isHandyman) throw new Error("You cannot cancel this request");
    if (task.status === "completed" || task.status === "cancelled")
      throw new Error("This request is already closed");

    const role = isClient ? "client" : "handyman";
    const beforeAgreement = task.status === "pending" || task.status === "negotiating";

    if (isClient && beforeAgreement) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("task_requests")
        .update({ status: "cancelled", cancel_requested_by: null, handyman_id: null })
        .eq("id", task.id);
      if (error) throw error;
      await supabaseAdmin.from("offers").update({ status: "declined" }).eq("task_id", task.id);
      await logTaskEvent(supabase, {
        taskId: task.id,
        actorId: userId,
        actorRole: role,
        type: "cancelled",
        message: data.reason || "Request cancelled by the client",
      });
      return { ok: true, cancelled: true, pendingAgreement: false };
    }

    // After agreement: both sides must agree.
    if (task.cancel_requested_by && task.cancel_requested_by !== userId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("task_requests")
        .update({ status: "cancelled", cancel_requested_by: null })
        .eq("id", task.id);
      if (error) throw error;
      await logTaskEvent(supabase, {
        taskId: task.id,
        actorId: userId,
        actorRole: role,
        type: "cancelled",
        message: data.reason || "Cancellation confirmed by both sides",
      });
      return { ok: true, cancelled: true, pendingAgreement: false };
    }

    const { error } = await supabase
      .from("task_requests")
      .update({ cancel_requested_by: userId })
      .eq("id", task.id);
    if (error) throw error;
    await logTaskEvent(supabase, {
      taskId: task.id,
      actorId: userId,
      actorRole: role,
      type: "cancel_requested",
      message: data.reason || "Asked the other side to agree on cancelling",
    });
    return { ok: true, cancelled: false, pendingAgreement: true };
  });

/** Either side postpones the request to a new preferred date. */
export const postponeTaskRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string; date: string; time?: string; reason?: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    if (!data?.date) throw new Error("Pick a new date");
    const time = String(data?.time ?? "").trim();
    if (time && !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) throw new Error("Pick a valid time");
    return {
      taskId: String(data.taskId),
      date: String(data.date),
      time: time || null,
      reason: String(data?.reason ?? "").trim(),
    };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: task, error: taskErr } = await supabase
      .from("task_requests")
      .select("id, client_id, handyman_id, status, postponed_to, start_time")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw taskErr;
    if (!task) throw new Error("Request not found");
    const isClient = task.client_id === userId;
    const isHandyman = task.handyman_id === userId;
    if (!isClient && !isHandyman) throw new Error("You cannot postpone this request");
    if (task.status === "completed" || task.status === "cancelled")
      throw new Error("This request is already closed");

    const mode = arrivalProposalMode(task.status, task.postponed_to, task.start_time);
    if (mode === "waiting") throw new Error("The arrival is set. Agree on the job before requesting a postponement.");
    const initial = mode === "initial";
    if (initial && !isHandyman) throw new Error("The handyman must propose the initial arrival time.");
    if (!data.time) throw new Error("Choose an exact arrival time");

    // The client owns the request: their postpone applies right away.
    if (isClient) {
      const { error } = await supabase
        .from("task_requests")
        .update({
          preferred_date: data.date,
          postponed_to: data.date,
          ...(data.time ? { start_time: data.time } : {}),
          postpone_requested_by: null,
          postpone_requested_date: null,
          postpone_requested_time: null,
          postpone_reason: null,
        })
        .eq("id", task.id).select("id").single();
      if (error) throw error;
      await logTaskEvent(supabase, {
        taskId: task.id,
        actorId: userId,
        actorRole: "client",
        type: "postponed",
        message: data.reason
          ? `Postponed to ${whenLabel(data.date, data.time)} — ${data.reason}`
          : `Postponed to ${whenLabel(data.date, data.time)}`,
      });
      return { ok: true, pending: false };
    }

    // The handyman asks to move the arrival — the client accepts or declines.
    const { error } = await supabase
      .from("task_requests")
      .update({
        postpone_requested_by: userId,
        postpone_requested_date: data.date,
        postpone_requested_time: data.time,
        postpone_reason: data.reason || null,
      })
      .eq("id", task.id).select("id").single();
    if (error) throw error;
    await logTaskEvent(supabase, {
      taskId: task.id,
      actorId: userId,
      actorRole: "handyman",
      type: initial ? "arrival_proposed" : "postpone_requested",
      message: `${initial ? "Proposed arrival" : "Asked to postpone arrival"} to ${whenLabel(data.date, data.time)}${data.reason ? ` — ${data.reason}` : ""}`,
    });
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("notifications").insert({
        user_id: task.client_id,
        task_id: task.id,
        title: initial ? "Arrival proposed" : "Postpone requested",
        body: `The handyman ${initial ? "proposed arrival" : "asked to postpone arrival"} at ${whenLabel(data.date, data.time)}.`,
      });
    } catch {
      /* notification delivery must not block the request */
    }
    return { ok: true, pending: true };
  });

/** Client accepts or declines a handyman's postpone request. */
export const respondPostponeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string; accept: boolean }) => {
    if (!data?.taskId) throw new Error("Missing request");
    return { taskId: String(data.taskId), accept: Boolean(data?.accept) };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: task, error: taskErr } = await supabase
      .from("task_requests")
      .select(
        "id, client_id, handyman_id, status, postponed_to, start_time, postpone_requested_by, postpone_requested_date, postpone_requested_time",
      )
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw taskErr;
    if (!task) throw new Error("Request not found");
    if (task.client_id !== userId) throw new Error("Only the client can answer a postpone request");
    if (!task.postpone_requested_by || !task.postpone_requested_date)
      throw new Error("There is no postpone request to answer");

    const mode = arrivalProposalMode(task.status, task.postponed_to, task.start_time);
    if (mode === "closed" || mode === "waiting") throw new Error("This request cannot accept a schedule change now");
    if (task.postpone_requested_by !== task.handyman_id) throw new Error("This proposal no longer belongs to the assigned handyman");
    const initial = mode === "initial";
    const newDate = task.postpone_requested_date;
    const newTime = task.postpone_requested_time ?? null;
    const when = whenLabel(newDate, newTime);
    const clear = {
      postpone_requested_by: null,
      postpone_requested_date: null,
      postpone_requested_time: null,
      postpone_reason: null,
    };
    const { error } = await supabase
      .from("task_requests")
      .update(
        data.accept
          ? {
              ...clear,
              preferred_date: newDate,
              postponed_to: newDate,
              ...(newTime ? { start_time: newTime } : {}),
            }
          : clear,
      )
      .eq("id", task.id).select("id").single();
    if (error) throw error;

    await logTaskEvent(supabase, {
      taskId: task.id,
      actorId: userId,
      actorRole: "client",
      type: initial ? (data.accept ? "arrival_accepted" : "arrival_declined") : (data.accept ? "postponed" : "postpone_declined"),
      message: data.accept
        ? `${initial ? "Arrival proposal" : "Postpone"} accepted — arrival ${when}`
        : `${initial ? "Arrival proposal" : "Postpone"} for ${when} declined`,
    });
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (task.handyman_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: task.handyman_id,
          task_id: task.id,
          title: `${initial ? "Arrival proposal" : "Postpone"} ${data.accept ? "accepted" : "declined"}`,
          body: data.accept
            ? `The client accepted the new arrival ${when}.`
            : `The client declined the ${initial ? "arrival proposal" : "postponement"} for ${when}.`,
        });
      }
    } catch {
      /* notification delivery must not block the response */
    }
    return { ok: true, accepted: data.accept };
  });


/** Client reports that the handyman never showed up — the request returns to its initial state. */
export const reportHandymanNoShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    return { taskId: String(data.taskId) };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: task, error: taskErr } = await supabase
      .from("task_requests")
      .select("id, client_id, handyman_id, status, preferred_date, postponed_to, start_time")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw taskErr;
    if (!task) throw new Error("Request not found");
    if (task.client_id !== userId) throw new Error("Only the client can report a no-show");
    if (task.status !== "agreed") throw new Error("This request is not waiting for the handyman");

    const day = task.postponed_to ?? task.preferred_date;
    if (!day) throw new Error("No arrival date is set for this request");
    const arrival = new Date(`${day}T${(task.start_time ?? "00:00:00").slice(0, 8)}`);
    if (Number.isNaN(arrival.getTime())) throw new Error("No arrival time is set for this request");
    if (Date.now() < arrival.getTime() + 30 * 60 * 1000)
      throw new Error("You can report a no-show 30 minutes after the agreed arrival time");

    const previousHandyman = task.handyman_id;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("task_requests")
      .update({
        status: "pending",
        handyman_id: null,
        agreed_price: null,
        progress: 0,
        cancel_requested_by: null,
        postponed_to: null,
        postpone_requested_by: null,
        postpone_requested_date: null,
        postpone_requested_time: null,
        postpone_reason: null,
      })
      .eq("id", task.id);
    if (error) throw error;

    await supabaseAdmin
      .from("offers")
      .update({ status: "withdrawn" })
      .eq("task_id", task.id)
      .in("status", ["pending", "accepted"]);

    await logTaskEvent(supabase, {
      taskId: task.id,
      actorId: userId,
      actorRole: "client",
      type: "handyman_no_show",
      message: "Handyman did not arrive — request reopened for other handymen",
    });

    try {
      if (previousHandyman) {
        await supabaseAdmin.from("notifications").insert({
          user_id: previousHandyman,
          task_id: task.id,
          title: "Marked as no-show",
          body: "The client reported that you did not arrive. The request was reopened.",
        });
      }
    } catch {
      /* notification delivery must not block the report */
    }
    return { ok: true };
  });

export const inviteHandyman = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; name?: string; message?: string }) => {
    const email = (data?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    return {
      email,
      name: (data?.name ?? "").trim().slice(0, 120),
      message: (data?.message ?? "").trim().slice(0, 1000),
    };
  })
  .handler(async ({ context, data }) => {
    const { data: invite, error } = await context.supabase
      .from("handyman_invites")
      .insert({
        inviter_id: context.userId,
        email: data.email,
        name: data.name,
        message: data.message,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: inviter } = await context.supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", context.userId)
      .single();
    const inviterName =
      [inviter?.first_name, inviter?.last_name].filter(Boolean).join(" ") || "A HandyFlow member";

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("handyman-invite", data.email, {
      templateData: {
        inviteeName: data.name || "there",
        inviterName,
        message: data.message,
      },
      idempotencyKey: `handyman-invite-${invite.id}`,
    });
    return { ok: true as const };
  });

export const sendSupportRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subject?: string; details: string }) => {
    const details = (data?.details ?? "").trim();
    if (details.length < 10) throw new Error("Please describe the problem in a bit more detail.");
    return {
      subject: (data?.subject ?? "").trim().slice(0, 140),
      details: details.slice(0, 4000),
    };
  })
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", context.userId)
      .single();
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    const userName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "A HandyFlow user";

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail("support-request", "admin@handyflow.me", {
      templateData: {
        userName,
        userEmail: profile?.email ?? context.userId,
        userRole: roleRow?.role ?? "member",

        subject: data.subject || "Support request",
        details: data.details,
      },
      ...(profile?.email ? { replyTo: profile.email } : {}),
    });
    if (!result.sent) throw new Error("The administrator email could not be delivered. Please contact support directly.");
    return { ok: true as const };
  });

export interface AskCandidate {
  id: string;
  name: string;
  role: string;
  available: boolean;
  worked: boolean;
}

/** Handymen a client can ask to take a request: public same-country crew plus past collaborators. */
export const getAskCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AskCandidate[]> => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("profiles")
      .select("country_code")
      .eq("id", userId)
      .maybeSingle();
    const country = me?.country_code ?? "";

    const [publicRes, historyRes] = await Promise.all([
      supabase
        .from("profile_directory")
        .select("id, name, headline, available, country_code")
        .not("headline", "is", null)
        .eq("is_public", true),
      supabase
        .from("task_requests")
        .select("handyman_id, handyman:profile_directory!task_requests_handyman_id_fkey(name, headline, available)")
        .eq("client_id", userId)
        .not("handyman_id", "is", null),
    ]);

    const map = new Map<string, AskCandidate>();
    for (const p of publicRes.data ?? []) {
      if (country && (p.country_code ?? "") !== country) continue;
      map.set(p.id, {
        id: p.id,
        name: p.name,
        role: p.headline ?? "Handyman",
        available: p.available,
        worked: false,
      });
    }
    for (const row of historyRes.data ?? []) {
      const id = row.handyman_id as string | null;
      if (!id) continue;
      const existing = map.get(id);
      if (existing) {
        existing.worked = true;
        continue;
      }
      const h = row.handyman as { name?: string; headline?: string | null; available?: boolean } | null;
      map.set(id, {
        id,
        name: h?.name ?? "Handyman",
        role: h?.headline ?? "Handyman",
        available: h?.available ?? true,
        worked: true,
      });
    }
    return [...map.values()].sort(
      (a, b) => Number(b.worked) - Number(a.worked) || a.name.localeCompare(b.name),
    );
  });

/** Client asks an existing handyman, or invites a new one by email, to take a request. */
export const askHandymanForTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string; handymanId?: string; email?: string; message?: string }) => {
    if (!data?.taskId) throw new Error("Missing request");
    const handymanId = (data?.handymanId ?? "").trim();
    const email = (data?.email ?? "").trim().toLowerCase();
    if (!handymanId && !email) throw new Error("Pick a handyman or enter an email address.");
    if (!handymanId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Enter a valid email address.");
    return {
      taskId: String(data.taskId),
      handymanId,
      email,
      message: (data?.message ?? "").trim().slice(0, 1000),
    };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: task, error: taskErr } = await supabase
      .from("task_requests")
      .select("id, title, client_id, handyman_id, status")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw taskErr;
    if (!task) throw new Error("Request not found");
    if (task.client_id !== userId) throw new Error("Only the client can ask a handyman");
    if (task.handyman_id) throw new Error("This request is already taken");
    if (task.status === "completed" || task.status === "cancelled")
      throw new Error("This request is already closed");

    const { data: client } = await supabase
      .from("profiles")
      .select("first_name, last_name, name")
      .eq("id", userId)
      .maybeSingle();
    const clientName =
      [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
      client?.name ||
      "A HandyFlow client";

    if (data.handymanId) {
      const { data: handyman } = await supabase
        .from("profile_directory")
        .select("name")
        .eq("id", data.handymanId)
        .maybeSingle();
      await logTaskEvent(supabase, {
        taskId: task.id,
        actorId: userId,
        actorRole: "client",
        type: "handyman_asked",
        message: data.message
          ? `Asked ${handyman?.name ?? "a handyman"} to take this request — ${data.message}`
          : `Asked ${handyman?.name ?? "a handyman"} to take this request`,
      });
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("notifications").insert({
          user_id: data.handymanId,
          task_id: task.id,
          title: "You were asked to take a request",
          body: data.message
            ? `${clientName}: "${task.title}" — ${data.message}`
            : `${clientName} asked you to take "${task.title}"`,
        });
      } catch {
        // notification delivery must never break the ask itself
      }
      return { asked: "handyman" as const, name: handyman?.name ?? "the handyman" };
    }


    const { data: invite, error: inviteErr } = await supabase
      .from("handyman_invites")
      .insert({
        inviter_id: userId,
        email: data.email,
        name: "",
        message: data.message,
      })
      .select("id")
      .single();
    if (inviteErr) throw new Error(inviteErr.message);

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("handyman-invite", data.email, {
      templateData: {
        inviteeName: "there",
        inviterName: clientName,
        message: data.message
          ? `${data.message} (Request: ${task.title})`
          : `I'd like you to take my request "${task.title}" on HandyFlow.`,
      },
      idempotencyKey: `task-ask-${invite.id}`,
    });

    await logTaskEvent(supabase, {
      taskId: task.id,
      actorId: userId,
      actorRole: "client",
      type: "handyman_invited",
      message: `Invited ${data.email} to join HandyFlow and take this request`,
    });
    return { asked: "email" as const, name: data.email };
  });
