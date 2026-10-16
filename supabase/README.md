# Shared CRM database

Both apps use project `rtaszifelvzbvcbqgrig` (CRM). DevLead owns `software`; RealEstate owns `realestate`. Auth and Storage are shared project services.

## Migration ownership

Run database commands from the repository root. `supabase/migrations/` is the canonical, combined history for this workspace. The 20 original migrations were copied unchanged from the app folders and checked against the remote migration history. The app-local folders remain historical copies for the original Lovable projects; do not apply them independently against CRM or add new migrations there. Bring any subsequent Lovable-generated migration into the root history before applying it here.

Create new migrations with `supabase migration new descriptive_name`. Review SQL across both schemas and shared Auth/Storage. Apply through the Supabase migration tool (or a linked CLI). If the remote migration tool assigns its own version, rename the CLI-created file to match that returned version and verify the SQL and history match. Never blindly replay old migrations against the live database.

The `isolate_app_access` migration preserves existing memberships, removes app-specific global Auth triggers, requires a verified-email invitation for new CRM membership, and adds private RealEstate profiles. Invitations expire seven days after creation. The original six sample rentals remain in the database with `status = 'demo'`; the normal feed selects `active` only.

## Baseline and previously unrecorded changes

The historical migration chain was not self-contained: it omitted creation of `realestate`, `software.api_keys`, Storage buckets, and other live schema changes. Do **not** use that chain by itself to bootstrap a new database.

`baseline/schema.sql` is a schema-only export of the actual deployed custom schemas after the access fix: tables, enums, functions, constraints, indexes, policies, grants, triggers, and app Storage bucket definitions/policies. It contains no Auth accounts, API-key values, rental data, or customer data. `baseline/history.sql` records the 21 migration versions represented by that export without executing their historical statements.

For a **new, empty Supabase target only**, after Supabase has provisioned its standard `auth` and `storage` schemas:

1. Review and run `baseline/schema.sql` with `psql -v ON_ERROR_STOP=1`.
2. Run `baseline/history.sql` with `psql -v ON_ERROR_STOP=1` to mark the included history applied.
3. Expose `software` and `realestate` in Data API settings.
4. Provision the application workspace and its initial owner explicitly. The current app uses workspace UUID `00000000-0000-0000-0000-000000000001` for website administration; create that workspace and add the intended verified Auth user's UUID with role `owner` through trusted administration. Do not restore automatic owner assignment.
5. Configure Auth email delivery and redirect URLs, and supply any required server secrets separately. Copy Storage objects separately if needed; they are not in the baseline.
6. Apply only migrations newer than the baseline. Do not run the archived initial migrations over the restored schema.

For an existing project, use incremental migrations only; **do not run either baseline file**. Refresh both baseline files together when deliberately creating a newer fresh-install checkpoint.

## Verification

`tests/app_isolation.sql` is an executable rollback-only integration test. It requires an existing owner and runs as `postgres`. It checks owner access, denied uninvited access, private favorites/searches/profiles/alerts, expired and unverified invitations, and valid invitation acceptance. All fixtures roll back. It has been run successfully against CRM. `bun run test:database` from the root also restores the complete baseline in an isolated PGlite Postgres runtime, supplies minimal stand-ins for Supabase-managed Auth/Storage objects, and reruns the isolation checks. This verifies custom-schema restoration; it does not emulate Supabase Auth email delivery or PostgREST.

Advisors after the migration report intentional SECURITY DEFINER RPCs (`is_member`, `is_admin`, `list_members`, `join_demo_workspace`), the intentionally server-only `api_keys` table with RLS and no client policies, and an existing disabled leaked-password check. Membership RPCs remain privileged because they need to look up protected membership/Auth records; they validate the caller rather than trusting user metadata. No new anonymous access to private data was added.

Advisor references: [privileged authenticated RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without client policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), and [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
