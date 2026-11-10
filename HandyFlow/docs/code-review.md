# Code review — local setup

## Findings still requiring application/database work

- **High: profile privacy is not enforced by the database.** `supabase/migrations/20260901111307_54a51e3a-3793-44e8-bdc4-de0f9e42c700.sql` replaces public reads with authenticated reads using `USING (true)`. Later migrations add addresses, phone numbers, and coordinates to the same table. The `is_public` flag does not restrict this policy. Any signed-in user can query these fields directly. Use a restricted public projection and owner/participant access policies for private fields. This finding is based on checked-in migrations; the live database was not audited or changed.
- **Medium: offer changes can leave inconsistent state and report success.** `rejectOffer` and `withdrawOffer` in `src/lib/handyflow.functions.ts` update the offer before updating the task, and ignore the second update's database error. Without the service-role key, the offer may already be modified when admin-client initialization throws. Move dependent writes to a database transaction/RPC and check all returned errors.

## Local configuration fixes

- Browser Supabase configuration now reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` instead of hard-coded credentials, so browser and server can target the same configured project.
- Added an environment template and ignored local environment files.
- Added an explicit Node version and a TypeScript check command.

## Scope

Reviewed startup/build configuration, authentication and Supabase integration, server action patterns, and database policies. This is not an exhaustive security audit. No production data or database policies were changed.

## Verification

- `bun install --frozen-lockfile --offline`: passes after dependency installation.
- `npm run typecheck`: passes.
- `npm run build`: passes (existing Cloudflare target).
- `npm run build:local`: passes (Node server target).
- `npm start`: starts the built Node server successfully with local environment files.
- HTTP smoke checks: `/`, `/auth`, `/pricing`, `/reset-password`, and `/dashboard`
  return 200 from both development and production servers. The dashboard response
  is the client-rendered shell, not evidence of successful authentication.
- Repository lint reports more than 2,200 existing issues, mostly formatting,
  plus explicit `any` types and Fast Refresh warnings. These were not suppressed
  or bulk-reformatted as part of the local setup.
- Browser automation became unavailable during verification. Hydration, login,
  and authenticated mutations have not been verified interactively. Missing
  server credentials still prevent the corresponding privileged/email actions.
