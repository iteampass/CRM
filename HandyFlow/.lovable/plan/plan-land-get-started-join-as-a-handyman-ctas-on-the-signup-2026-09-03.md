# Plan: Land "Get Started" / "Join as a Handyman" CTAs on the signup form

## Problem
The `/auth` page defaults to the **sign-in** form (`useState<"signin" | "signup">("signin")`).
Every public CTA (`Get Started`, `Find a Handyman`, `Become a Handyman`, `Join as a Handyman`,
pricing cards, services, `Post Your First Request`) links to plain `/auth`, so users land on
**sign-in** even though those buttons clearly intend **sign-up**. Only `Log In` should keep the
sign-in default.

## Approach
Pass intent through the URL with query params, and have `/auth` initialize its form mode (and
handyman/client role) from them. No new routes, no DB/auth logic changes.

- `/auth`                     → sign-in (unchanged, used by `Log In`)
- `/auth?mode=signup`         → sign-up form, role defaults to `client`
- `/auth?mode=signup&role=handyman` → sign-up form, role pre-selected to `handyman`

## Changes

### 1. `src/routes/auth.tsx`
- Add a typed search schema to the route via `validateSearch` (zod) accepting optional
  `mode: "signin" | "signup"` and `role: "client" | "handyman"`.
- Read the search params with `useSearch` and use them to seed the initial `mode` and `role`
  state (via lazy initializer so it only applies on mount, not on every search change).
- Keep the existing toggle behavior intact; the params only affect the *initial* state.

### 2. `src/components/landing/LandingChrome.tsx` (header)
- `Get Started` button → `to="/auth" search={{ mode: "signup" }}`
- `Log In` button → stays plain `/auth` (sign-in default)

### 3. `src/routes/pricing.tsx`
- Homeowner card ("Find a Handyman") → `/auth?mode=signup` (client)
- Handyman Beginner card ("Join as a Handyman") → `/auth?mode=signup&role=handyman`
- Hidden Handyman Pro / Team cards kept as-is for future use.

### 4. `src/routes/index.tsx` (landing page CTAs)
Update all sign-up-intent `Link to="/auth"` to carry search params:
- Hero `Find a Handyman` → `?mode=signup` (client)
- Hero `Become a Handyman` → `?mode=signup&role=handyman`
- Services cards → `?mode=signup` (client)
- ForClients `Post Your First Request` → `?mode=signup` (client)
- ForHandymen `Join as a Handyman` → `?mode=signup&role=handyman`
- FinalCta `Find a Handyman` → `?mode=signup` (client)
- FinalCta `Become a Handyman` → `?mode=signup&role=handyman`

## Notes
- TanStack Router `<Link>` supports a `search` prop for query params; no manual string building.
- `useSearch` + `validateSearch` gives type-safe params without `useLocation` parsing.
- No changes to auth flow, Supabase, or the dashboard. Only navigation intent + initial form state.
