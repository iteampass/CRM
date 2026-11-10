> Shared CRM migration: follow [the launch runbook](docs/shared-project-launch.md). Do not replay this app's historical migrations against CRM.

# HandyFlow

A React 19 / TanStack Start app using Vite, Tailwind CSS, and Supabase.
The app builds and runs independently with a Node server.

## Run locally

Use Node.js 22.12 or newer (Node 22 is specified in `.nvmrc`) and Bun 1.4.2.
Use Bun to install the exact versions in the committed `bun.lock`; npm can run
the scripts once dependencies are installed.

```sh
nvm use
bun install --frozen-lockfile
npm run dev
```

Open the local URL printed by Vite. Keep the terminal running.

The supplied `.env` contains public connection settings for the existing hosted
Supabase project. The app runs locally but still uses that remote database;
changes made while signed in affect that project.

To use a different Supabase project or configure server secrets, copy
`.env.example` to `.env.local` and fill in its values. Set both the `VITE_` and
server Supabase settings to the **same project**. Restart Vite after changing
environment files. Never prefix a service-role key or other secret with `VITE_`.

## Backend requirements

- The target Supabase database needs the schema in `supabase/migrations`.
  The supplied hosted project is the default; a fresh database requires applying
  these migrations in filename order using your Supabase workflow.
- Email/password sign-in requires an existing account or registration with the
  configured Supabase project. Add your local app origin and
  `/reset-password` URL to that project's permitted authentication redirects.
- `SUPABASE_SERVICE_ROLE_KEY` is needed by privileged server actions such as
  releasing/cancelling tasks and creating some notifications. It is not included
  in the export. Put it in `.env.local` on the server only.
- `RESEND_API_KEY` and `EMAIL_FROM` are needed for invitations, support and Pro
  request emails. Use a sender from a domain verified in Resend.
- Google sign-in uses Supabase OAuth; configure its Google provider separately.
- Signup and recovery emails use Supabase custom SMTP. Configure Resend there
  separately and disable any old Send Email hook pointing to the removed preview service.

This setup does not start an offline database or mock authenticated accounts.

## Checks

```sh
npm run typecheck
npm run lint
npm run build:local
npm start
```

`npm run build` and `npm run build:local` create a Node server; `npm start` loads `.env` and
`.env.local` and serves that build (port 3000 by default).

Repository-wide lint currently reports
existing formatting and typing issues; see [the code review](docs/code-review.md)
for findings and verification limits.

See [independent deployment setup](docs/independent-setup.md) for email configuration and external account disconnection.
# Codex_handy_tasks_flow
