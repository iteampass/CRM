import type {
  Candidate,
  Comment,
  Interview,
  Position,
  User,
} from "@/lib/types";

export const currentUser: User = {
  id: "u-1",
  firstName: "Ivan",
  lastName: "Stojsic",
  email: "ivan.stojsic@northlane.io",
  phone: "+381 60 442 1180",
  companyPosition: "Head of Talent Acquisition",
  createdAt: "2025-11-04T09:12:00Z",
};

export const users: User[] = [
  currentUser,
  {
    id: "u-2",
    firstName: "Marta",
    lastName: "Kovacevic",
    email: "marta.k@northlane.io",
    phone: "+381 61 220 9931",
    companyPosition: "Technical Recruiter",
    createdAt: "2025-11-09T10:00:00Z",
  },
  {
    id: "u-3",
    firstName: "Daniel",
    lastName: "Brenner",
    email: "daniel.brenner@northlane.io",
    phone: "+49 151 2233 881",
    companyPosition: "Staff Engineer",
    createdAt: "2025-10-21T08:40:00Z",
  },
  {
    id: "u-4",
    firstName: "Priya",
    lastName: "Raman",
    email: "priya.raman@northlane.io",
    phone: "+44 7700 118 220",
    companyPosition: "Engineering Manager",
    createdAt: "2025-09-30T11:15:00Z",
  },
  {
    id: "u-5",
    firstName: "Elena",
    lastName: "Marchetti",
    email: "elena.marchetti@northlane.io",
    phone: "+39 340 771 2204",
    companyPosition: "People Operations Lead",
    createdAt: "2025-08-18T13:05:00Z",
  },
];

export const positions: Position[] = [
  {
    id: "p-1",
    name: "Senior Frontend Engineer",
    department: "Engineering",
    description:
      "Own the design-system and core product surfaces. React, TypeScript, strong product sense.",
    status: "open",
    createdAt: "2026-06-02T09:00:00Z",
  },
  {
    id: "p-2",
    name: "Product Designer",
    department: "Design",
    description:
      "End-to-end product design for the recruiter workspace. Systems thinking, high craft bar.",
    status: "open",
    createdAt: "2026-06-19T09:00:00Z",
  },
  {
    id: "p-3",
    name: "Backend Engineer, Platform",
    department: "Engineering",
    description: "Distributed services, Postgres, event pipelines and internal APIs.",
    status: "open",
    createdAt: "2026-05-11T09:00:00Z",
  },
  {
    id: "p-4",
    name: "Data Analyst",
    department: "Data",
    description: "Hiring funnel analytics, reporting and experimentation support.",
    status: "paused",
    createdAt: "2026-04-08T09:00:00Z",
  },
  {
    id: "p-5",
    name: "Customer Success Manager",
    department: "Revenue",
    description: "Own enterprise accounts through onboarding, adoption and renewal.",
    status: "open",
    createdAt: "2026-07-01T09:00:00Z",
  },
];

const parsed = (over: Partial<Candidate["parsedResumeData"]> & object) =>
  ({
    summary: "",
    yearsOfExperience: 0,
    location: "",
    links: [],
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    ...over,
  }) as NonNullable<Candidate["parsedResumeData"]>;

export const candidates: Candidate[] = [
  {
    id: "c-1",
    firstName: "Sofia",
    lastName: "Lindqvist",
    email: "sofia.lindqvist@gmail.com",
    phone: "+46 70 118 3320",
    resumeUrl: "/resumes/sofia-lindqvist.pdf",
    resumeMeta: { fileName: "Sofia-Lindqvist-CV-EN.pdf", sizeKb: 126.17, pages: 2 },
    resumeText: `SOFIA LINDQVIST
Senior Frontend Engineer - Stockholm, Sweden
sofia.lindqvist@gmail.com · +46 70 118 3320

PROFILE
Frontend engineer with 8 years of experience building design systems and
data-dense product interfaces for B2B SaaS. Owned the migration of a 400k-user
dashboard to React 18 and TypeScript.

EXPERIENCE
Klarna - Senior Frontend Engineer (2022 - Present)
· Led the internal component library used by 9 product teams.
· Reduced first contentful paint by 41% across merchant tooling.

Tink - Frontend Engineer (2019 - 2022)
· Built the account aggregation console and its accessibility layer.

Spotify - Frontend Engineer, Ads (2017 - 2019)
· Campaign management UI, experimentation tooling.

EDUCATION
KTH Royal Institute of Technology - MSc Computer Science (2012 - 2017)

SKILLS
TypeScript · React · Design systems · Accessibility · Testing · Performance`,
    parsedResumeData: parsed({
      summary:
        "Senior frontend engineer focused on design systems and data-dense B2B interfaces. Eight years across fintech and marketplace products, with a track record of leading component-library work used by multiple product teams.",
      yearsOfExperience: 8,
      location: "Stockholm, Sweden",
      links: [
        { label: "GitHub", url: "github.com/slindqvist" },
        { label: "Portfolio", url: "lindqvist.design" },
      ],
      experience: [
        {
          company: "Klarna",
          role: "Senior Frontend Engineer",
          period: "2022 - Present",
          description:
            "Led the internal component library adopted by nine product teams; cut merchant dashboard load time by 41%.",
        },
        {
          company: "Tink",
          role: "Frontend Engineer",
          period: "2019 - 2022",
          description:
            "Built the account aggregation console and drove the accessibility programme to WCAG 2.1 AA.",
        },
        {
          company: "Spotify",
          role: "Frontend Engineer, Ads",
          period: "2017 - 2019",
          description: "Campaign management interfaces and internal experimentation tooling.",
        },
      ],
      education: [
        {
          school: "KTH Royal Institute of Technology",
          degree: "MSc Computer Science",
          period: "2012 - 2017",
        },
      ],
      skills: [
        "TypeScript",
        "React",
        "Design systems",
        "Accessibility",
        "Testing",
        "Performance",
        "GraphQL",
      ],
      certifications: ["AWS Certified Developer - Associate"],
      languages: [
        { name: "Swedish", level: "Native" },
        { name: "English", level: "Fluent" },
        { name: "German", level: "Intermediate" },
      ],
    }),
    status: "technical",
    positionId: "p-1",
    createdAt: "2026-08-11T08:30:00Z",
    updatedAt: "2026-09-04T15:20:00Z",
  },
  {
    id: "c-2",
    firstName: "Tomás",
    lastName: "Ferreira",
    email: "tomas.ferreira@outlook.com",
    phone: "+351 912 448 210",
    resumeUrl: "/resumes/tomas-ferreira.pdf",
    resumeMeta: { fileName: "TomasFerreira_Resume.pdf", sizeKb: 98.4, pages: 1 },
    resumeText: `TOMÁS FERREIRA
Product Designer - Lisbon, Portugal

PROFILE
Product designer with 6 years of experience in B2B tooling. Systems-first
approach, comfortable shipping alongside engineers.

EXPERIENCE
Unbabel - Senior Product Designer (2021 - Present)
Talkdesk - Product Designer (2018 - 2021)

EDUCATION
Universidade de Lisboa - BA Communication Design`,
    parsedResumeData: parsed({
      summary:
        "Systems-oriented product designer with six years in B2B tooling; owns discovery through shipped UI and maintains the design system alongside engineering.",
      yearsOfExperience: 6,
      location: "Lisbon, Portugal",
      links: [{ label: "Portfolio", url: "tferreira.work" }],
      experience: [
        {
          company: "Unbabel",
          role: "Senior Product Designer",
          period: "2021 - Present",
          description:
            "Redesigned the translator workspace; owns the shared Figma library and design tokens.",
        },
        {
          company: "Talkdesk",
          role: "Product Designer",
          period: "2018 - 2021",
          description: "Agent console and reporting surfaces for contact-centre customers.",
        },
      ],
      education: [
        {
          school: "Universidade de Lisboa",
          degree: "BA Communication Design",
          period: "2014 - 2018",
        },
      ],
      skills: ["Figma", "Design systems", "Prototyping", "User research", "Motion"],
      certifications: [],
      languages: [
        { name: "Portuguese", level: "Native" },
        { name: "English", level: "Fluent" },
        { name: "Spanish", level: "Fluent" },
      ],
    }),
    status: "final",
    positionId: "p-2",
    createdAt: "2026-07-29T10:10:00Z",
    updatedAt: "2026-09-05T09:45:00Z",
  },
  {
    id: "c-3",
    firstName: "Amara",
    lastName: "Okonkwo",
    email: "amara.okonkwo@proton.me",
    phone: "+44 7488 220 913",
    resumeUrl: "/resumes/amara-okonkwo.pdf",
    resumeMeta: { fileName: "A_Okonkwo_Backend.pdf", sizeKb: 143.9, pages: 2 },
    resumeText: `AMARA OKONKWO
Backend Engineer - London, UK

PROFILE
Platform engineer, 7 years. Go, Postgres, Kafka. Built multi-tenant billing
infrastructure processing 40M events per day.

EXPERIENCE
Monzo - Backend Engineer (2021 - Present)
Deliveroo - Backend Engineer (2019 - 2021)

EDUCATION
University of Manchester - BSc Software Engineering`,
    parsedResumeData: parsed({
      summary:
        "Platform engineer with seven years building multi-tenant services in Go and Postgres, including billing infrastructure handling 40M events per day.",
      yearsOfExperience: 7,
      location: "London, United Kingdom",
      links: [{ label: "GitHub", url: "github.com/aokonkwo" }],
      experience: [
        {
          company: "Monzo",
          role: "Backend Engineer",
          period: "2021 - Present",
          description: "Owns the ledger ingestion pipeline and its reconciliation tooling.",
        },
        {
          company: "Deliveroo",
          role: "Backend Engineer",
          period: "2019 - 2021",
          description: "Rider dispatch services and internal platform APIs.",
        },
      ],
      education: [
        {
          school: "University of Manchester",
          degree: "BSc Software Engineering",
          period: "2015 - 2019",
        },
      ],
      skills: ["Go", "PostgreSQL", "Kafka", "Kubernetes", "Terraform", "gRPC"],
      certifications: ["CKA - Certified Kubernetes Administrator"],
      languages: [
        { name: "English", level: "Native" },
        { name: "French", level: "Basic" },
      ],
    }),
    status: "interview",
    positionId: "p-3",
    createdAt: "2026-08-22T14:00:00Z",
    updatedAt: "2026-09-03T11:05:00Z",
  },
  {
    id: "c-4",
    firstName: "Jonas",
    lastName: "Weber",
    email: "jonas.weber@mail.de",
    phone: "+49 176 2200 448",
    resumeUrl: "/resumes/jonas-weber.pdf",
    resumeMeta: { fileName: "Weber_Jonas_CV.pdf", sizeKb: 88.2, pages: 1 },
    resumeText: `JONAS WEBER
Frontend Engineer - Berlin, Germany

4 years building React applications for logistics and mobility products.`,
    parsedResumeData: parsed({
      summary:
        "Frontend engineer with four years in logistics and mobility products; strong React and testing fundamentals, growing into systems work.",
      yearsOfExperience: 4,
      location: "Berlin, Germany",
      links: [{ label: "GitHub", url: "github.com/jweber" }],
      experience: [
        {
          company: "FlixBus",
          role: "Frontend Engineer",
          period: "2022 - Present",
          description: "Booking funnel and seat-selection interfaces.",
        },
        {
          company: "Sennder",
          role: "Junior Frontend Engineer",
          period: "2020 - 2022",
          description: "Internal shipment tracking tools.",
        },
      ],
      education: [
        { school: "TU Berlin", degree: "BSc Informatik", period: "2016 - 2020" },
      ],
      skills: ["React", "TypeScript", "Vitest", "CSS Architecture"],
      certifications: [],
      languages: [
        { name: "German", level: "Native" },
        { name: "English", level: "Fluent" },
      ],
    }),
    status: "screening",
    positionId: "p-1",
    createdAt: "2026-09-01T07:20:00Z",
    updatedAt: "2026-09-02T08:00:00Z",
  },
  {
    id: "c-5",
    firstName: "Nadia",
    lastName: "Haddad",
    email: "nadia.haddad@gmail.com",
    phone: "+33 6 55 21 88 04",
    resumeUrl: null,
    resumeMeta: null,
    resumeText: null,
    parsedResumeData: null,
    status: "new",
    positionId: "p-5",
    createdAt: "2026-09-06T06:15:00Z",
    updatedAt: "2026-09-06T06:15:00Z",
  },
  {
    id: "c-6",
    firstName: "Mateusz",
    lastName: "Zielinski",
    email: "m.zielinski@wp.pl",
    phone: "+48 512 330 771",
    resumeUrl: "/resumes/mateusz-zielinski.pdf",
    resumeMeta: { fileName: "Zielinski-Data-Analyst.pdf", sizeKb: 112.5, pages: 2 },
    resumeText: `MATEUSZ ZIELINSKI
Data Analyst - Kraków, Poland

5 years of analytics in marketplace and HR-tech companies. SQL, dbt, Python.`,
    parsedResumeData: parsed({
      summary:
        "Analyst with five years across marketplace and HR-tech companies; owns funnel reporting, dbt models and experiment readouts.",
      yearsOfExperience: 5,
      location: "Kraków, Poland",
      links: [],
      experience: [
        {
          company: "Allegro",
          role: "Data Analyst",
          period: "2021 - Present",
          description: "Seller growth analytics and A/B testing programme.",
        },
        {
          company: "HRtec",
          role: "Junior Analyst",
          period: "2019 - 2021",
          description: "Recruitment funnel dashboards and cohort reporting.",
        },
      ],
      education: [
        { school: "AGH University", degree: "MSc Applied Mathematics", period: "2014 - 2019" },
      ],
      skills: ["SQL", "dbt", "Python", "Looker", "Statistics"],
      certifications: ["Google Data Analytics"],
      languages: [
        { name: "Polish", level: "Native" },
        { name: "English", level: "Fluent" },
      ],
    }),
    status: "rejected",
    positionId: "p-4",
    createdAt: "2026-07-14T09:40:00Z",
    updatedAt: "2026-08-12T16:30:00Z",
  },
  {
    id: "c-7",
    firstName: "Hana",
    lastName: "Ishikawa",
    email: "hana.ishikawa@icloud.com",
    phone: "+81 90 4412 8830",
    resumeUrl: "/resumes/hana-ishikawa.pdf",
    resumeMeta: { fileName: "Ishikawa_Hana_CV_EN.pdf", sizeKb: 134.0, pages: 2 },
    resumeText: `HANA ISHIKAWA
Product Designer - Tokyo, Japan

7 years designing enterprise software. Previously at Mercari and Sansan.`,
    parsedResumeData: parsed({
      summary:
        "Enterprise product designer with seven years in Japanese SaaS; specialises in dense data interfaces and multilingual design systems.",
      yearsOfExperience: 7,
      location: "Tokyo, Japan",
      links: [{ label: "Portfolio", url: "hanaishikawa.jp" }],
      experience: [
        {
          company: "Mercari",
          role: "Senior Product Designer",
          period: "2020 - Present",
          description: "Seller tooling and internal operations consoles.",
        },
        {
          company: "Sansan",
          role: "Product Designer",
          period: "2017 - 2020",
          description: "CRM data-management interfaces.",
        },
      ],
      education: [
        { school: "Musashino Art University", degree: "BA Design", period: "2013 - 2017" },
      ],
      skills: ["Figma", "Information architecture", "Design systems", "Localization"],
      certifications: [],
      languages: [
        { name: "Japanese", level: "Native" },
        { name: "English", level: "Business" },
      ],
    }),
    status: "offer",
    positionId: "p-2",
    createdAt: "2026-06-30T05:00:00Z",
    updatedAt: "2026-09-01T12:00:00Z",
  },
  {
    id: "c-8",
    firstName: "Gabriel",
    lastName: "Santos",
    email: "gabriel.santos@gmail.com",
    phone: "+55 11 98220 4471",
    resumeUrl: "/resumes/gabriel-santos.pdf",
    resumeMeta: { fileName: "GabrielSantos_Backend.pdf", sizeKb: 101.8, pages: 1 },
    resumeText: `GABRIEL SANTOS
Backend Engineer - São Paulo, Brazil

6 years. Python, Django, AWS. Fintech payments background.`,
    parsedResumeData: parsed({
      summary:
        "Backend engineer with six years in fintech payments; Python and AWS, strong on reliability and on-call ownership.",
      yearsOfExperience: 6,
      location: "São Paulo, Brazil",
      links: [{ label: "GitHub", url: "github.com/gsantos" }],
      experience: [
        {
          company: "Nubank",
          role: "Backend Engineer",
          period: "2021 - Present",
          description: "Card authorisation services and fraud-signal pipelines.",
        },
        {
          company: "Stone",
          role: "Backend Engineer",
          period: "2019 - 2021",
          description: "Merchant settlement APIs.",
        },
      ],
      education: [
        { school: "USP", degree: "BSc Computer Engineering", period: "2014 - 2019" },
      ],
      skills: ["Python", "Django", "AWS", "PostgreSQL", "Redis"],
      certifications: ["AWS Solutions Architect - Associate"],
      languages: [
        { name: "Portuguese", level: "Native" },
        { name: "English", level: "Business" },
      ],
    }),
    status: "hired",
    positionId: "p-3",
    createdAt: "2026-05-20T13:30:00Z",
    updatedAt: "2026-08-28T10:00:00Z",
  },
  {
    id: "c-9",
    firstName: "Leila",
    lastName: "Farhadi",
    email: "leila.farhadi@gmail.com",
    phone: "+31 6 2144 9902",
    resumeUrl: "/resumes/leila-farhadi.pdf",
    resumeMeta: { fileName: "Leila-Farhadi-CSM.pdf", sizeKb: 76.3, pages: 1 },
    resumeText: `LEILA FARHADI
Customer Success Manager - Amsterdam, Netherlands

9 years in enterprise SaaS account management.`,
    parsedResumeData: parsed({
      summary:
        "Customer success leader with nine years in enterprise SaaS; owns renewals and expansion for accounts above €250k ARR.",
      yearsOfExperience: 9,
      location: "Amsterdam, Netherlands",
      links: [{ label: "LinkedIn", url: "linkedin.com/in/lfarhadi" }],
      experience: [
        {
          company: "Personio",
          role: "Senior CSM",
          period: "2020 - Present",
          description: "Enterprise portfolio of 22 accounts, 118% net revenue retention.",
        },
        {
          company: "Mollie",
          role: "Customer Success Manager",
          period: "2017 - 2020",
          description: "Onboarding and adoption for mid-market merchants.",
        },
      ],
      education: [
        { school: "Universiteit van Amsterdam", degree: "MA Business Studies", period: "2011 - 2016" },
      ],
      skills: ["Account management", "Renewals", "Onboarding", "QBRs", "Salesforce"],
      certifications: [],
      languages: [
        { name: "Dutch", level: "Native" },
        { name: "English", level: "Fluent" },
        { name: "Persian", level: "Native" },
      ],
    }),
    status: "interview",
    positionId: "p-5",
    createdAt: "2026-08-18T08:00:00Z",
    updatedAt: "2026-09-05T14:10:00Z",
  },
  {
    id: "c-10",
    firstName: "Oliver",
    lastName: "Novak",
    email: "oliver.novak@seznam.cz",
    phone: "+420 733 210 447",
    resumeUrl: null,
    resumeMeta: null,
    resumeText: null,
    parsedResumeData: null,
    status: "new",
    positionId: "p-1",
    createdAt: "2026-09-05T16:45:00Z",
    updatedAt: "2026-09-05T16:45:00Z",
  },
];

export const interviews: Interview[] = [
  {
    id: "i-1",
    candidateId: "c-1",
    interviewerId: "u-2",
    interviewType: "Recruiter screen",
    score: 8,
    comments:
      "Very clear communicator. Motivation is genuine - wants ownership of a design system rather than feature delivery.",
    criteria: [
      { label: "Communication", score: 9 },
      { label: "Motivation", score: 8 },
      { label: "Experience fit", score: 8 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-18T10:00:00Z",
    createdAt: "2026-08-18T11:00:00Z",
  },
  {
    id: "i-2",
    candidateId: "c-1",
    interviewerId: "u-3",
    interviewType: "Technical interview",
    score: 7,
    comments:
      "Solid on rendering performance and accessibility. Slightly shaky on state-management trade-offs at scale.",
    criteria: [
      { label: "Problem solving", score: 7 },
      { label: "Code quality", score: 8 },
      { label: "System design", score: 6 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-28T13:00:00Z",
    createdAt: "2026-08-28T14:30:00Z",
  },
  {
    id: "i-3",
    candidateId: "c-1",
    interviewerId: "u-4",
    interviewType: "Hiring manager",
    score: 9,
    comments: "Strong product instincts. Would raise the bar on the frontend team immediately.",
    criteria: [
      { label: "Ownership", score: 9 },
      { label: "Collaboration", score: 9 },
      { label: "Product sense", score: 9 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-09-03T09:30:00Z",
    createdAt: "2026-09-03T10:20:00Z",
  },
  {
    id: "i-4",
    candidateId: "c-2",
    interviewerId: "u-2",
    interviewType: "Recruiter screen",
    score: 9,
    comments: "Excellent portfolio walkthrough, very structured thinking.",
    criteria: [
      { label: "Communication", score: 9 },
      { label: "Craft", score: 9 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-05T09:00:00Z",
    createdAt: "2026-08-05T10:00:00Z",
  },
  {
    id: "i-5",
    candidateId: "c-2",
    interviewerId: "u-4",
    interviewType: "Portfolio deep dive",
    score: 8,
    comments: "Great systems work. Wanted more evidence of measurable outcomes.",
    criteria: [
      { label: "Craft", score: 9 },
      { label: "Impact", score: 7 },
      { label: "Collaboration", score: 8 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-21T14:00:00Z",
    createdAt: "2026-08-21T15:10:00Z",
  },
  {
    id: "i-6",
    candidateId: "c-2",
    interviewerId: "u-1",
    interviewType: "Final interview",
    score: null,
    comments: "",
    criteria: [],
    status: "scheduled",
    durationMinutes: 60,
    interviewDate: "2026-09-09T11:00:00Z",
    createdAt: "2026-09-05T09:45:00Z",
  },
  {
    id: "i-7",
    candidateId: "c-3",
    interviewerId: "u-2",
    interviewType: "Recruiter screen",
    score: 8,
    comments: "Good depth on platform work, clear on why they want to move.",
    criteria: [
      { label: "Communication", score: 8 },
      { label: "Experience fit", score: 8 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-27T15:00:00Z",
    createdAt: "2026-08-27T16:00:00Z",
  },
  {
    id: "i-8",
    candidateId: "c-3",
    interviewerId: "u-3",
    interviewType: "Technical interview",
    score: null,
    comments: "",
    criteria: [],
    status: "scheduled",
    durationMinutes: 60,
    interviewDate: "2026-09-08T10:00:00Z",
    createdAt: "2026-09-03T11:05:00Z",
  },
  {
    id: "i-9",
    candidateId: "c-4",
    interviewerId: "u-2",
    interviewType: "Recruiter screen",
    score: 6,
    comments: "Promising but early for a senior scope. Worth keeping warm for mid-level roles.",
    criteria: [
      { label: "Communication", score: 7 },
      { label: "Experience fit", score: 5 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-09-02T08:00:00Z",
    createdAt: "2026-09-02T08:45:00Z",
  },
  {
    id: "i-10",
    candidateId: "c-6",
    interviewerId: "u-2",
    interviewType: "Recruiter screen",
    score: 5,
    comments: "Analytical fundamentals fine, but no experience with our reporting stack.",
    criteria: [
      { label: "Technical depth", score: 5 },
      { label: "Experience fit", score: 4 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-05T12:00:00Z",
    createdAt: "2026-08-05T13:00:00Z",
  },
  {
    id: "i-11",
    candidateId: "c-7",
    interviewerId: "u-4",
    interviewType: "Portfolio deep dive",
    score: 9,
    comments: "Exceptional information architecture work. Clear senior signal.",
    criteria: [
      { label: "Craft", score: 10 },
      { label: "Impact", score: 9 },
      { label: "Collaboration", score: 8 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-12T07:00:00Z",
    createdAt: "2026-08-12T08:00:00Z",
  },
  {
    id: "i-12",
    candidateId: "c-7",
    interviewerId: "u-5",
    interviewType: "Values interview",
    score: 9,
    comments: "Thoughtful about feedback culture and cross-timezone collaboration.",
    criteria: [
      { label: "Values fit", score: 9 },
      { label: "Communication", score: 9 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-26T07:30:00Z",
    createdAt: "2026-08-26T08:20:00Z",
  },
  {
    id: "i-13",
    candidateId: "c-8",
    interviewerId: "u-3",
    interviewType: "Technical interview",
    score: 8,
    comments: "Strong reliability mindset, good incident stories.",
    criteria: [
      { label: "System design", score: 8 },
      { label: "Code quality", score: 8 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-07-21T13:00:00Z",
    createdAt: "2026-07-21T14:00:00Z",
  },
  {
    id: "i-14",
    candidateId: "c-8",
    interviewerId: "u-4",
    interviewType: "Hiring manager",
    score: 9,
    comments: "Clear ownership, pragmatic. Offer approved.",
    criteria: [
      { label: "Ownership", score: 9 },
      { label: "Collaboration", score: 9 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-04T13:00:00Z",
    createdAt: "2026-08-04T14:00:00Z",
  },
  {
    id: "i-15",
    candidateId: "c-9",
    interviewerId: "u-5",
    interviewType: "Recruiter screen",
    score: 7,
    comments: "Strong enterprise background, checking commercial depth next round.",
    criteria: [
      { label: "Communication", score: 8 },
      { label: "Experience fit", score: 7 },
    ],
    status: "completed",
    durationMinutes: 60,
    interviewDate: "2026-08-25T09:00:00Z",
    createdAt: "2026-08-25T10:00:00Z",
  },
];

export const comments: Comment[] = [
  {
    id: "cm-1",
    candidateId: "c-1",
    authorId: "u-2",
    content:
      "Sourced from the Stockholm frontend meetup. Notice period is one month, salary expectation within band.",
    stage: "recruiter",
    createdAt: "2026-08-18T11:12:00Z",
    updatedAt: "2026-08-18T11:12:00Z",
  },
  {
    id: "cm-2",
    candidateId: "c-1",
    authorId: "u-3",
    content:
      "Pairing session went well. Reasoned carefully about re-render cost and wrote tests unprompted. I'd want a second opinion on architecture scope.",
    stage: "technical",
    createdAt: "2026-08-28T14:40:00Z",
    updatedAt: "2026-08-28T14:40:00Z",
  },
  {
    id: "cm-3",
    candidateId: "c-1",
    authorId: "u-4",
    content: "Agreed with Daniel. Scope concern is fair, but the trajectory is clearly senior. Move to final.",
    stage: "final",
    createdAt: "2026-09-03T10:25:00Z",
    updatedAt: "2026-09-03T10:25:00Z",
  },
  {
    id: "cm-4",
    candidateId: "c-2",
    authorId: "u-2",
    content: "Available to start in three weeks. Prefers hybrid, two days in the Lisbon office.",
    stage: "recruiter",
    createdAt: "2026-08-05T10:05:00Z",
    updatedAt: "2026-08-05T10:05:00Z",
  },
  {
    id: "cm-5",
    candidateId: "c-2",
    authorId: "u-5",
    content: "Reference check with previous manager completed - positive, no flags.",
    stage: "hr",
    createdAt: "2026-09-01T08:30:00Z",
    updatedAt: "2026-09-01T08:30:00Z",
  },
  {
    id: "cm-6",
    candidateId: "c-3",
    authorId: "u-2",
    content: "Interested specifically in the ledger work. Competing offer expected mid-September, keep pace up.",
    stage: "recruiter",
    createdAt: "2026-08-27T16:10:00Z",
    updatedAt: "2026-08-27T16:10:00Z",
  },
  {
    id: "cm-7",
    candidateId: "c-7",
    authorId: "u-5",
    content: "Offer package prepared, relocation support confirmed by finance.",
    stage: "hr",
    createdAt: "2026-09-01T12:05:00Z",
    updatedAt: "2026-09-01T12:05:00Z",
  },
  {
    id: "cm-8",
    candidateId: "c-6",
    authorId: "u-1",
    content: "Rejected for this role. Good candidate for the analytics engineer opening next quarter.",
    stage: "recruiter",
    createdAt: "2026-08-12T16:35:00Z",
    updatedAt: "2026-08-12T16:35:00Z",
  },
  {
    id: "cm-9",
    candidateId: "c-9",
    authorId: "u-5",
    content: "Very polished. Wants clarity on the commission structure before the next stage.",
    stage: "hr",
    createdAt: "2026-08-25T10:15:00Z",
    updatedAt: "2026-08-25T10:15:00Z",
  },
];
