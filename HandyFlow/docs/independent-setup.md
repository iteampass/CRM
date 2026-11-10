# Independent HandyFlow setup

The app no longer imports Lovable packages, sends editor telemetry, shares authentication with its preview frame, proxies its assets, or exposes its email preview/webhook endpoints. Both build scripts produce a standalone Node server. Google authentication continues through Supabase.

## Application email through Resend

Add these server-only values to `.env.local` (or your hosting environment):

```dotenv
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="HandyFlow <noreply@your-verified-domain>"
```

Use a sender domain verified in your own Resend account. Do not assume the old `notify.handyflow.me` DNS delegation is usable: verify your chosen domain in Resend. Restart the app after setting environment variables. Never use a `VITE_` prefix for secrets.

Support and Pro requests go to `admin@handyflow.me`; invitations go to the invited recipient. Existing React Email templates are retained. Transport failures are shown as errors. The app does not automatically activate Pro plans.

Reference: https://resend.com/docs/api-reference/emails/send-email

## Supabase authentication emails

Signup confirmation and password recovery are sent by Supabase, separately from application emails. Configure Resend SMTP in Supabase Authentication settings. If a Send Email hook points to an old `/lovable/email/auth/webhook` URL, disable that hook so custom SMTP handles delivery. Keep the current project data and Google provider configuration. Update permitted redirect URLs when changing the app's host/domain.

References:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

## Disconnect external services

Removing code cannot revoke external account access. These dashboard operations have not been performed by this local migration:

1. In Lovable, open Project settings → Git and disconnect the repository. This stops two-way sync and preserves repository history. Remove the workspace Git connection or revoke the provider app's repository access if it is no longer needed by other projects.
2. Review Lovable's access to your Supabase organization/project and revoke the integration where configured. If Lovable had server secrets, rotate those credentials and update the independent server. Do not delete the database/project.
3. If the public site is hosted by Lovable, deploy this build to independent Node hosting and move the custom domain before retiring the old hosting. Local code changes do not alter the existing public deployment.
4. Remove old Lovable API/send/cron variables from hosting. If a scheduler is used, configure `CRON_SECRET` (and optionally `CRON_SECRET_PREVIOUS`) in both the server and scheduler.

Git connection reference: https://docs.lovable.dev/integrations/git-sync-overview

## Run

```sh
bun install --frozen-lockfile
npm run dev
```

The development server listens on port 3000 on the LAN. For a production build:

```sh
npm run build
npm start
```

The SVG and ICO favicons now use the green HandyFlow hammer mark. Refresh the browser's cached favicon if it still shows the previous icon.
