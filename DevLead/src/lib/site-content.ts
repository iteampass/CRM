export type Project = { name: string; badge: string; description: string; tags: string; liveUrl: string; liveLabel: string; sourceUrl: string; preview: "password" | "handyman" };
export type HeroSlide = { id: string; path: string; alt: string; url?: string };
export type SiteContent = {
  heroSlides: HeroSlide[];
  hero: { availability: string; name: string; title: string; tagline: string; subtext: string; location: string };
  techStrip: string[];
  about: { heading: string; paragraphs: string[]; years: string };
  skills: { title: string; tools: string[] }[];
  services: { title: string; text: string }[];
  projects: Project[];
  steps: { title: string; text: string }[];
  contact: { heading: string; text: string; email: string; availability: string };
  socials: { github: string; linkedin: string };
};

export const defaultContent: SiteContent = {
  heroSlides: [{ id: "original", path: "", alt: "A bright, modern developer workspace beside a city-facing window" }],
  hero: { availability: "Available for freelance projects", name: "Ivan", title: "Full Stack Developer", tagline: "I build fast, scalable web apps from database to UI.", subtext: "Thoughtful engineering. Clean interfaces. One developer, from the first idea to the final launch.", location: "Belgrade, Serbia" },
  techStrip: ["React", "TypeScript", "Node.js", "PostgreSQL", "Supabase"],
  about: { heading: "The whole stack. The bigger picture.", years: "3", paragraphs: [
    "I’m Ivan, a full stack developer based in Belgrade, Serbia. With 3 years of experience, I work across the frontend, backend, and everything that connects them.",
    "I help clients turn ideas into useful web applications—balancing a clean user experience with a solid technical foundation. I care about code that’s maintainable and products that solve real problems.",
    "From a new product to an existing platform that needs a fresh start, I’m available for freelance work on a per-project basis.",
  ] },
  skills: [
    { title: "Frontend", tools: ["React", "TypeScript", "Tailwind CSS", "Next.js"] },
    { title: "Backend", tools: ["Node.js", "Python", "REST APIs", "GraphQL"] },
    { title: "Databases", tools: ["PostgreSQL", "MongoDB", "Supabase"] },
    { title: "DevOps & tools", tools: ["Git", "Docker", "CI/CD", "Vercel", "AWS"] },
  ],
  services: [
    { title: "Custom web apps", text: "Turn your idea into a practical, scalable application built around your business." },
    { title: "API & backend development", text: "Reliable APIs, well-structured databases, and integrations that connect the dots." },
    { title: "Frontend & UI development", text: "Fast, accessible interfaces that feel natural on every screen." },
    { title: "Maintenance & optimization", text: "Keep your product healthy. Improve performance, resolve issues, and build what’s next." },
  ],
  projects: [
    { name: "TeamPass", badge: "Live application", preview: "password", description: "A team password manager that brings shared credentials into one organized place. Built around a practical need: keeping team access simple.", tags: "Security · Team collaboration", liveUrl: "https://teampassw.io", liveLabel: "Live site", sourceUrl: "https://github.com/iteampass/TeamPass" },
    { name: "HandyFlow", badge: "", preview: "handyman", description: "A web app connecting clients with nearby handymen. Bringing local services and the people who need them together in one place.", tags: "Web application · Local services", liveUrl: "https://www.handyflow.me", liveLabel: "Live demo", sourceUrl: "" },
  ],
  steps: [
    { title: "Discovery", text: "We talk about your goals, your users, and the problem worth solving." },
    { title: "Planning", text: "A clear scope, the right stack, and a practical roadmap before we build." },
    { title: "Development", text: "Iterative development with regular updates and room for your feedback." },
    { title: "Launch & support", text: "A careful launch, a clean handover, and support for the next chapter." },
  ],
  contact: { heading: "Have something in mind?", text: "A new idea, a tricky problem, or a project that needs another pair of hands. I’d love to hear about it.", email: "ivan@teampass.me", availability: "Freelance per project" },
  socials: { github: "https://github.com/iteampass", linkedin: "https://www.linkedin.com/in/ivan-stojsic-857635423/" },
};

/** Merge saved content over defaults so missing keys never break the page. */
export function mergeContent(saved: unknown): SiteContent {
  if (!saved || typeof saved !== "object") return defaultContent;
  const s = saved as Partial<SiteContent>;
  const d = defaultContent;
  return {
    heroSlides: Array.isArray(s.heroSlides) && s.heroSlides.length ? s.heroSlides : d.heroSlides,
    hero: { ...d.hero, ...s.hero }, about: { ...d.about, ...s.about }, contact: { ...d.contact, ...s.contact }, socials: { ...d.socials, ...s.socials },
    techStrip: s.techStrip ?? d.techStrip, skills: s.skills ?? d.skills, services: s.services ?? d.services,
    projects: s.projects ?? d.projects, steps: s.steps ?? d.steps,
  };
}
