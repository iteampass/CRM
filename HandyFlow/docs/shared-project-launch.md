> **Restore completed 2026-11-10:** schema migration `20261110071547` and selective data restore from the supplied export are applied to CRM. The earlier preparation/access-blocker notes below are historical. No source-project connection was needed. Avatars were reset as requested. Deployment and the documented business-authorization hardening remain separate work.
>
> Verified: 25 Auth accounts total (24 imported; one mapped to the existing verified account without changing its Auth row or providers), 38 profiles including 13 demo profiles, 25 tasks, 12 offers, 5 reviews, 46 events. All 12 tables have RLS; nonmembers see no private profiles/tasks/directory. Avatar paths are null and the new bucket is private and empty. Existing sessions, recovery tokens, Storage binaries and platform schemas were not restored. Users must sign in again; the existing shared account uses its current credentials. OAuth configuration still needs checking before launch. Private data/password hashes are excluded from the repository.

# HandyFlow shared-project launch

Prepared 2026-11-10. Destination: `rtaszifelvzbvcbqgrig` (CRM), schema `handyflow`.
Live inspection found an empty HandyFlow schema, existing `software` and `realestate` schemas, no application triggers on `auth.users`, and private `avatars` / `website-slides` buckets. No production migration, Auth setting, credential, file or user data was changed during this preparation.

## What to deploy

Use the canonical repository-root migration:
`../../supabase/migrations/20261110071547_bootstrap_handyflow_shared_project.sql`.

It creates the 12 application tables, directory view, enums, functions, indexes, RLS and grants, two Realtime subscriptions, nine repair categories, disabled testimonial settings, and private `handyflow-avatars` bucket (5 MiB, JPEG/PNG/WebP/AVIF). It can run against the existing empty schema. It fails transactionally if application objects already exist; do not run it twice or over an imported schema. Existing Auth, CRM tables and buckets are preserved.

**Do not replay HandyFlow's historical public-schema migrations against CRM.** The app-local `move_handyflow_to_dedicated_schema` migration only moves objects inside the old project; it does not transfer anything between projects. The older app-local bootstrap is an incomplete draft and is superseded by the root migration.

App clients and Realtime use `handyflow`. Verified users explicitly enroll through `handyflow.enroll()` when signing in to HandyFlow. New HandyFlow email signups supply an app marker and client/handyman choice. Google users and existing shared-project users initially enroll as clients. Enrollment is idempotent, never grants admin, and never runs when users merely sign up in the other apps. Existing members retain their roles. There is no global Auth trigger. Server handlers additionally require HandyFlow membership.

This is an open-registration app, not an invitation-only workspace. If membership must be invitation-only, replace enrollment before launch. Admin assignment is an explicit database-administrator action for the intended verified user after enrollment; ownership in another app does not confer HandyFlow admin.

## Deployment sequence

1. Decide whether this is a fresh start or a data transfer. The prepared migration contains reference data only, not existing users/jobs/files. Do not open registration before an intended data transfer is complete.
2. Back up the destination and rehearse on a staging project. Review the root SQL and apply only this migration through the root Supabase workflow; inspect remote migration history first. Do not blindly `db push` either app's full historical chain.
3. Add `handyflow` to Data API exposed schemas, preserving `public`, `graphql_public`, `software`, and `realestate`. Local `config.toml` does not change hosted settings. Do not introduce an authenticator `pgrst.db_schemas` override that hides existing apps.
4. Add the actual HandyFlow deployment's `/auth` and `/reset-password` URLs to Auth redirect allowlists, retaining other apps' URLs. Verify email confirmation, recovery templates, SMTP and Google OAuth for the shared project. Do not change the shared Site URL or SMTP branding without considering both existing apps.
5. Configure environment variables below; build after configuring browser variables. Run `bun run check:launch`, then `bun run check:launch -- --remote` after the schema is exposed. The remote check is a read-only anonymous categories request; it does not validate server secrets or email delivery.
6. Deploy HandyFlow as its own Vercel project, root directory `HandyFlow`, framework TanStack Start, Node 22.12+, install `bun install --frozen-lockfile`, build `bun run build`. Nitro creates the server function; this is not a static SPA. Do not select `dist` as a static output directory. A standalone Node deployment uses `bun run build:local` then `bun run start` instead.
7. Complete authorization fixes listed below before a public production launch. Smoke-test signup/confirmation, existing-user login, Google login, recovery, profile/avatar, client request, handyman offer, acceptance, messages, notifications, cancellation/no-show, reviews and email. Re-check DevLead and RealEstate login and data access.
8. Assign the intended HandyFlow administrator explicitly, verify admin settings, then enable traffic. Keep the source available until transfer/rollback acceptance is complete.

## Environment

The copied local `.env` still targets the source project and lacks `SUPABASE_SERVICE_ROLE_KEY`. It was not overwritten. Copy `.env.example` to `.env.local`, then set the destination credentials locally and in Vercel's correct environment scopes.

| Variable | Value / scope |
| --- | --- |
| `VITE_SUPABASE_URL`, `SUPABASE_URL` | `https://rtaszifelvzbvcbqgrig.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | Same destination publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Destination server-only service-role/secret key; required for privileged actions |
| `RESEND_API_KEY` | Server-only email credential |
| `EMAIL_FROM` | Sender on a verified Resend domain |

Never put a service-role key in `VITE_*` or commit credentials. Resend application emails are separate from Supabase Auth's SMTP configuration. Review `admin@handyflow.me` support/Pro recipients and the sender before production. The repository has a cron-auth helper but no active scheduled route; no cron deployment is needed for the current app.

## If transferring existing data

The source project is `shknqqfzohehvnilbaze`. Inventory record counts and Storage objects first. Decide whether to preserve source Auth identities or map them onto existing destination users. Resolve duplicate email addresses explicitly; do not import Auth tables wholesale into the shared project. Preserve/map every profile and role ID and all task, offer, review, message, event, invitation, testimonial and notification references together. Password/session/provider migration needs a separate supported Auth plan; old sessions do not work on the new project.

Import application rows into `handyflow` in dependency order, reconcile the seeded categories by slug, copy avatar files into `handyflow-avatars`, and rewrite object paths if user IDs change. Preserve private bucket access; do not copy old public URLs. Verify counts, foreign keys, role assignments and file access before cutover. Use a source write freeze or a defined final delta transfer. No export/import has been executed or assumed.

## Review findings

Addressed in this preparation:

- Missing destination enrollment and schema-bound access; no effect on other apps' signups.
- Shared avatar bucket collision; now a dedicated private bucket with owner/member policies.
- Direct offer updates could bypass atomic resolution. Authenticated UPDATE is revoked; decisions use `resolve_offer`. New offers must be pending and positive.
- A direct testimonial insert could self-approve. Inserts now require membership, pending status and no featured flag.
- Missing reference data, canonical destination migration and deployment preflight.

**Remaining public-launch blockers:**

- Task update policies still permit participants to change more fields than the intended workflow (including ownership, agreed price and status); the claim policy does not enforce field immutability. Server checks cannot prevent direct Data API calls. Replace business transitions with narrowly authorized transactional RPCs or equivalent database guards, then test concurrent claim/accept/cancel/no-show actions. Related privileged multi-write cancellation/no-show paths are not atomic.
- Country scoping for open jobs is partly performed after reading rows in the application. The database's unassigned-task read policy does not enforce the same country restriction. If country boundaries are intended access boundaries, enforce them in RLS before launch.
- Profile UPDATE permissions include derived rating/job-count fields. Use column-level grants or guarded writes so users cannot manufacture trust metrics. Review immutable review/offer/task references at the same time.

These are existing business-authorization issues, separate from moving schemas. The migration and builds being valid do not certify the application safe for public production.

## Verification and rollback

`bun test tests` includes the historical migration tests and a new isolated Postgres test of the actual canonical destination migration. It checks no automatic cross-app enrollment, verified-email enforcement, role spoofing, membership isolation, own-profile access, avatar isolation, category seeding and preservation of other schemas. It uses PGlite stand-ins for Auth/Storage and cannot validate hosted PostgREST, email, OAuth or real Storage uploads.

Run `bun run typecheck`, `bun run build:local`, and `NITRO_PRESET=vercel bun run build` locally. Use `supabase/checks/handyflow-schema.sql` for read-only hosted inspection after deployment, then the smoke tests above.

Rollback the application/environment to the old deployment first if cutover fails. Leave the additive destination schema intact for investigation. Do not drop the shared project, Auth users, other schemas or buckets. Once new writes exist, reconcile them before any rollback to the source database.

Reference: https://supabase.com/docs/guides/api/using-custom-schemas

## Confirmed transfer requirement and access blocker

The owner confirmed that existing HandyFlow data must be transferred. Treat this as a migration with a controlled cutover, not a fresh launch. The current Supabase connection denied access to source project `shknqqfzohehvnilbaze`, so source counts, current schema, Auth collisions, password/provider portability and file inventory remain unverified. Grant source-project access through the connection or supply protected exports to continue. Never paste credentials into chat.

`supabase/transfer/inventory.sql` prepares read-only inventories for both projects. Its commented minimal Auth export can feed `node scripts/plan-transfer.mjs SOURCE_USERS.json DESTINATION_USERS.json NEW_PLAN.json`. Keep these files outside Git. The planner writes a private, non-overwriting UUID decision report without copying emails into the result. It flags UUID collisions and unverified-email matches and requires ownership review before reusing an existing account. It performs no imports, provisioning or automatic merges.

After reviewing that mapping, provision missing identities through a supported Auth migration process. Then import the application's tables, applying the approved mapping to every user reference. Preserve source category IDs (replace the fresh reference seeds before importing dependent jobs), and reconcile site settings deliberately. Export and inspect the actual foreign-key inventory first; do not infer all references solely from names. Job cancellation/postponement fields and JSON payloads may also contain user IDs. Transfer binaries through the Storage API rather than inserting `storage.objects` rows. Record source/destination counts and object checksums for acceptance.

Validation completed locally: 29 tests passed in the main suite and the added transfer-planner test passed separately; TypeScript, standalone Node and Vercel production builds passed. The repository-wide lint command reports 2,707 errors and 9 warnings, predominantly formatting, including untouched files; it is not a clean lint baseline. Build output contains existing TanStack validator deprecation and bundle-size warnings. None of these checks performs a live transfer.
