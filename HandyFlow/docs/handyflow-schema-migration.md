> For the shared CRM destination, use [shared-project-launch.md](shared-project-launch.md). The instructions below describe the original in-project move, not a cross-project transfer.

# Move HandyFlow into its own schema

## Scope and deployment order

The migration `supabase/migrations/20261109220957_move_handyflow_to_dedicated_schema.sql`
moves the existing HandyFlow database objects from `public` to `handyflow` **within
the original database**. It does not transfer data between Supabase projects.
The application now explicitly uses `handyflow` for browser, server, anonymous,
and authenticated queries, RPCs, and Realtime subscriptions.

Do not deploy this application change against a database that still uses `public`.
Do not run the historical migrations on a shared destination: they create objects
in `public` and could collide with another application.

1. Back up the original database and test restoration into an isolated database.
   Inventory live schema drift, row counts, owners, grants, policies, triggers,
   and dependencies before applying anything. The migration assumes the earlier
   HandyFlow migrations are already installed.
2. Schedule a maintenance window and stop HandyFlow writes and signups. The old
   application expects `public` and will stop working after the schema move.
3. Apply the new migration to the **original HandyFlow project**, using the
   normal migration runner. Check its pending migration list first; do not replay
   historical migrations manually. The migration is transactional and refuses
   an existing `handyflow` schema or missing required tables/functions.
4. In the hosted project's API settings, add `handyflow` to **Exposed schemas**.
   Keep schemas needed by other apps. `supabase/config.toml` configures local
   development only; it does not update hosted API settings. See the
   [Supabase custom-schema documentation](https://supabase.com/docs/guides/api/using-custom-schemas).
5. Deploy/restart this application version. For an in-place move, project URL
   and keys remain unchanged. Smoke-test anonymous testimonials, signup/sign-in,
   request creation, offer acceptance, participant contact details, and Realtime.
6. Run `supabase/checks/handyflow-schema.sql`, compare counts with the backup,
   and run Supabase Security and Performance Advisors on the actual project.
   Resume traffic only after verification.

On failure before COMMIT, roll back the transaction; existing objects remain in
`public`. After COMMIT, reverting application code alone is insufficient. Keep
writes paused and restore the tested pre-migration backup together with the old
application, or prepare and validate a reverse migration. A backup restore after
new writes would lose those writes.

## What moves

Twelve tables (`profiles`, `user_roles`, `repair_categories`, `task_requests`,
`offers`, `messages`, `reviews`, `task_events`, `handyman_invites`, `notifications`,
`testimonials`, `site_settings`), `profile_directory`, three enums, and eight
functions move. Object identity, rows, constraints, indexes, table policies,
existing grants, and Realtime publication membership are preserved. Function
bodies and search paths are updated. The auth signup trigger remains on
`auth.users`, with the distinct name `handyflow_on_auth_user_created`.

The directory view intentionally keeps its existing limited-column,
permission-controlled behavior. This migration does not broaden grants or
redesign existing RLS. Unrelated `public` objects are left in place.

## Combining projects is a separate cutover

A custom schema prevents database object-name collisions; it is **not** an Auth
or tenant boundary. Before importing into the selected shared project:

- Reconcile users by identity and email. Preserve source UUIDs where possible;
  otherwise remap every reference consistently. Passwords, OAuth identities,
  and existing sessions require an Auth migration plan. Do not copy/overwrite
  the destination's entire `auth` schema. Expect users to sign in again.
- Review each app's policies for membership checks. Existing HandyFlow policies
  permit some reads to any authenticated user. In a shared project this includes
  users of the other apps. Decide whether that is intended before merging.
- Adapt signup provisioning for shared Auth. The current HandyFlow trigger runs
  on every signup and reads generic role metadata. Other apps' role values or
  triggers can conflict. Establish app membership and safe provisioning rules
  before installing the trigger on a shared destination.
- Export/import the `handyflow` schema and its data into an empty destination
  schema, preserving required dependencies, owners and grants. A schema-only
  dump cannot copy rows; a schema-filtered dump also does not include everything
  outside that schema, such as the trigger on `auth.users`, Storage policies,
  or the shared Realtime publication. Provision those explicitly after review.
- Copy avatar files and review the existing `avatars` bucket and its policies.
  Storage objects/files are not moved by this migration. Use a distinct bucket
  if another app already owns that name, and update application references.
- Configure shared Auth redirect allowlists, site URL, providers, email
  templates/SMTP, exposed schemas, and Realtime for all apps. Add the two
  HandyFlow tables to the destination's existing `supabase_realtime`
  publication without replacing other applications' publication membership.
- Update browser and server Supabase URLs/keys together, and review deployment
  secrets and server email configuration. Never expose the service-role key
  to the browser. Re-test access isolation across apps before switching traffic.
- Coordinate future database migrations centrally; the Supabase migration
  history is project-wide, not isolated per application schema.

## Validation performed in the repository

`tests/schema-migration.test.ts` reconstructs the historical schema in PGlite,
then executes the actual migration. It checks data and ACL preservation, RLS,
contact/offer RPC authorization, signup/rating triggers, publication membership,
unrelated public objects, and transactional failure behavior. Historical
repeated policy definitions are reconciled only in the test fixture.

These checks do not replace testing hosted PostgREST, Auth, Storage and Realtime
against the chosen project. Live migration and cross-project import are separate
operations and have not been performed by these code changes.
