import { z } from "zod";

export const socialSearchInput = z.object({
  location: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[\p{L}\p{N}\s,.'’-]+$/u),
  source: z.enum(["all", "reddit", "x"]),
  subreddit: z
    .string()
    .trim()
    .max(21)
    .regex(/^[A-Za-z0-9_]*$/)
    .default(""),
});
export type SocialSearchInput = z.infer<typeof socialSearchInput>;
export type SocialPost = {
  id: string;
  source: "reddit" | "x";
  title: string;
  text: string;
  author: string;
  url: string;
  publishedAt: string;
};
export type SourceResult = {
  source: "reddit" | "x";
  status: "ok" | "unconfigured" | "error";
  message?: string;
  posts: SocialPost[];
};
