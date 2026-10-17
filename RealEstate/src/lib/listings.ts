import apt1 from "@/assets/apt1.jpg";
import apt2 from "@/assets/apt2.jpg";
import apt3 from "@/assets/apt3.jpg";
import apt4 from "@/assets/apt4.jpg";

export type Listing = {
  id: string;
  title: string;
  area: string;
  price: number;
  beds: number;
  baths: number;
  size: number;
  image: string;
  source: string;
  foundAgo: string;
  score: number;
  risk: "low" | "medium" | "high";
  duplicates: number;
  furnished: boolean;
  x: number;
  y: number;
};

export const listings: Listing[] = [
  {
    id: "1",
    title: "Bright 2BR with skyline view",
    area: "Vračar",
    price: 950,
    beds: 2,
    baths: 1,
    size: 72,
    image: apt1,
    source: "Halo Oglasi",
    foundAgo: "4 min ago",
    score: 94,
    risk: "low",
    duplicates: 2,
    furnished: true,
    x: 38,
    y: 30,
  },
  {
    id: "2",
    title: "Terrace apartment with pool",
    area: "Dedinje",
    price: 2400,
    beds: 3,
    baths: 2,
    size: 140,
    image: apt2,
    source: "Facebook group",
    foundAgo: "12 min ago",
    score: 88,
    risk: "low",
    duplicates: 0,
    furnished: true,
    x: 22,
    y: 62,
  },
  {
    id: "3",
    title: "High-rise loft near river",
    area: "Belgrade Waterfront",
    price: 1350,
    beds: 2,
    baths: 2,
    size: 88,
    image: apt3,
    source: "4zida",
    foundAgo: "31 min ago",
    score: 81,
    risk: "medium",
    duplicates: 1,
    furnished: false,
    x: 55,
    y: 48,
  },
  {
    id: "4",
    title: "Cozy studio, quiet street",
    area: "Dorćol",
    price: 480,
    beds: 1,
    baths: 1,
    size: 34,
    image: apt4,
    source: "Reddit",
    foundAgo: "1 h ago",
    score: 76,
    risk: "high",
    duplicates: 3,
    furnished: true,
    x: 62,
    y: 20,
  },
  {
    id: "5",
    title: "Renovated flat by the park",
    area: "Novi Beograd",
    price: 720,
    beds: 2,
    baths: 1,
    size: 61,
    image: apt1,
    source: "Nekretnine.rs",
    foundAgo: "2 h ago",
    score: 72,
    risk: "low",
    duplicates: 0,
    furnished: false,
    x: 30,
    y: 80,
  },
  {
    id: "6",
    title: "Penthouse with two terraces",
    area: "Senjak",
    price: 1800,
    beds: 3,
    baths: 2,
    size: 120,
    image: apt3,
    source: "Instagram",
    foundAgo: "3 h ago",
    score: 69,
    risk: "medium",
    duplicates: 1,
    furnished: true,
    x: 48,
    y: 70,
  },
];

export const formatPrice = (n: number, locale = "en-GB") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
