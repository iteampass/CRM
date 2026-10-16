# CRM applications

- `DevLead/`: software sales CRM and public portfolio (`software` schema).
- `RealEstate/`: Nestly rental app (`realestate` schema).
- `supabase/`: canonical database migrations, schema baseline, and integration checks for their shared Supabase project.

See [database workflow](supabase/README.md) before any database deployment. Existing `.env` files configure both apps for the same CRM project; never commit secrets.

## Local development

Install each app's locked dependencies using `bun install --frozen-lockfile`, then run `bun run dev` in separate terminals. Use different ports, for example `bun run dev --port 5173` for DevLead and `bun run dev --port 5174` for RealEstate. Run `bun run test` and `bunx tsc --noEmit` within each app; production builds use `bun run build`.

Supabase authentication is shared, but CRM access requires an existing membership or an unexpired invitation. A RealEstate login does not grant CRM access. Add local/production `/account` URLs to Supabase Auth's allowed redirects if using emailed links. Email OTP entry is also supported using the project's email template containing `{{ .Token }}`. No sign-in emails are sent by tests.

RealEstate's normal feed shows active database listings only. To preview the original sample apartments locally, explicitly set `VITE_DEMO_MODE=true` in `RealEstate/.env.local` and restart Vite. Demo mode is labeled and demo bookmarks are disabled. Keep this flag unset for normal use.

Favorites, saved-search CRUD, and profile preferences persist to Supabase under the current user. Automatic rental ingestion/matching, email/push alerts, and paid subscriptions are not implemented; the UI marks them unavailable. Server-side DevLead scanning/AI features additionally need their existing runtime secrets configured; publishable browser keys do not replace service-role credentials.
