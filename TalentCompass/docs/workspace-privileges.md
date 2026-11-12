# Workspace privileges

## Database deployment required

Apply `supabase/migrations/20260925090000_workspace_privileges.sql` once in the connected Supabase project's SQL editor before deploying the app changes. This migration assumes the existing workspace and position-membership tables and helper functions are already installed in the talent schema. It runs in a transaction. The application fails closed if the new privilege tables/columns cannot be loaded.

Apply this migration through your Supabase SQL editor or database deployment workflow. Existing migration-file deletions in the working tree were left unchanged; do not reset or recreate the production database.

Then apply `supabase/migrations/20260926090000_candidate_privileges.sql` to enable the two candidate permissions. Existing users receive no new candidate grants automatically. Apply migrations in timestamp order; these changes have been tested locally, not applied to the hosted database.

## Roles

- **Workspace admin:** sees and manages the entire workspace, grants/revokes roles, and manages members and invitations. Only these users create new positions. The last workspace admin cannot be removed or demoted.
- **Position admin:** reads and edits assigned positions and their candidates, resumes, interviews, evaluations, comments, and attendance. Cannot grant privileges or access unassigned positions.
- **Interview group member:** reads data for assigned positions. Can add candidate comments linked to a completed, past interview only after an admin records their attendance. Cannot edit candidates, upload/parse resumes, change scores, manage attendance, or grant privileges.
- **Create candidate:** can create unassigned candidates, or candidates for positions they already have access to. Can upload and extract resumes for candidates they created, without gaining candidate editing, deletion, interview management, or commenting rights. Own candidates remain readable while this permission is enabled.
- **View candidates:** can read all workspace candidates, resumes, and associated interview/comment data, without write privileges or access to position management. Independent of Create candidate.
- **No assignment or candidate privileges:** no recruitment data access. The user's own profile remains accessible.

Workspace settings has **Members & invitations** and **Privilege management** tabs. Select a user in the latter to change workspace-admin status assign roles for each position, and select Create candidate and View candidates. Selections remain pending until **Apply** is clicked; **Cancel** discards them. Apply or cancel before switching members. If a save partially fails, the UI reloads saved privileges and keeps the remaining changes available to retry. Roles are independent per position; workspace-admin status overrides position roles.

Old `position_members` rows become interview-group assignments. No old interviews are assumed to have been attended, and no users are automatically promoted to position admin. Position visibility now always follows explicit roles, regardless of the old `access_restricted` setting.

## Interview attendance

Open the interview's details, mark it completed after it has taken place, and select the group members who actually attended under **Interview attendance**. Workspace and position admins can record/revoke attendance. Group members then select that interview when adding a note on the candidate. Merely being the scheduled interviewer does not grant comment permission.

Data reads and writes, role changes, comment authorship, and resume storage are enforced through PostgreSQL row-level security and restricted functions, in addition to UI controls. Removing someone from a workspace clears their assignments, candidate grants, and attendance. Returning focus to the app refreshes privilege state and data.

## Validation

The SQL tests run only in a fresh disposable PostgreSQL-compatible database and never contact production. To run with PGlite without adding application dependencies:

```sh
npm install --prefix /tmp/tc-privilege-tests --no-audit --no-fund @electric-sql/pglite
PGLITE_MODULE=/tmp/tc-privilege-tests/node_modules/@electric-sql/pglite/dist/index.js node tests/privileges.test.mjs
PGLITE_MODULE=/tmp/tc-privilege-tests/node_modules/@electric-sql/pglite/dist/index.js node tests/candidate-privileges.test.mjs
```

The suite tests workspace isolation, admin grants, last-admin protection, unassigned users, position read/write scope, privilege escalation, attendance, comment authorship, and resume storage permissions.

## Supabase schema

All browser, authenticated server, and admin database requests use `talent`. Add `talent` to the hosted project’s Data API exposed schemas. The SQL scripts target `talent` and require the base tables, enums, and helper functions there; they do not move existing data from `public`. Do not rerun already-applied migrations to relocate a database. Auth and Storage retain their Supabase-managed schemas.

When regenerating TypeScript database types, select `--schema talent` and retain `talent` as the default schema in the generated helper types.
