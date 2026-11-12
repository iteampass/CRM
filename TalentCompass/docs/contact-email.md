# Contact email

The landing-page contact form sends email through Resend from a TanStack server function.

Add these settings to your existing local `.env` (see `.env.example`), and set the same server environment variables in your hosting provider for deployment:

- `CONTACT_EMAIL_TO`: recipient address; initially `ivan.teampass@gmail.com`.
- `CONTACT_EMAIL_FROM`: approved Resend sender, for example `Talent Compass <contact@your-verified-domain.com>`.
- `RESEND_API_KEY`: Resend API key with permission to send email.

Restart the development server after editing `.env`, or redeploy after changing hosted environment variables. Keep these settings server-only; do not use a `VITE_` or `NEXT_PUBLIC_` prefix. The local `.env` is ignored by Git.

Verify your sender domain in Resend. Its test sender `onboarding@resend.dev` can only send to the email address associated with your Resend account. See the [Resend email API documentation](https://resend.com/docs/api-reference/emails/send-email).

The visitor's address is used as Reply-To. Success is shown only after the provider accepts the email; failed requests preserve the form so the visitor can retry. Provider acceptance does not guarantee inbox delivery: check Resend delivery logs and the recipient's spam folder during testing.

The endpoint is public so visitors can contact the team without signing in. Apply rate limiting in your hosting provider before exposing it to significant public traffic.

## Workspace invitations

When an admin supplies an email, creating an invitation immediately sends its `/auth?invite=...` link to that address using the same `RESEND_API_KEY` and `CONTACT_EMAIL_FROM`. Set `APP_URL` to the public application origin (for example `https://talent.example.com`), including in your hosting environment. The contact recipient setting does not affect invitation recipients.

Without an email, creation still produces a shareable link. Missing mail configuration prevents email-addressed invitation creation. If the provider fails after creation, the invitation remains visible and usable and the UI warns that delivery was not confirmed. Copy its link to share it manually. Existing invitations are not automatically sent.
