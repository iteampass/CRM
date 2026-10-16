<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- CRM data lives in the Supabase `software` schema, read/written from the browser via `supabase.schema("software")` under RLS (workspace membership); generated types don't cover it, so access is untyped.
- `src/lib/mock-data.ts` is the client data store: `loadCrm()` fills shared arrays in the `_authenticated` layout's beforeLoad, so screens read them synchronously.
- Job-board scanning lives in `src/lib/jobs/*.server.ts` (one adapter per source in `sources.server.ts`); it runs via the secret-protected `/api/public/jobs/scan` route (external scheduler) or the admin-only `scanJobBoardsNow` server fn, writing with the service-role client — so each source stays swappable and scheduled runs need no user session.
- Scans use a DB lease (`job_scan_settings.locked_until`), a per-run extraction cap and a persisted `paused_reason` on AI credit/access errors — prevents overlapping runs and runaway AI spend.
- A lead (`software.leads`) is one opportunity at one company; people link to it via `software.lead_contacts` with a role and primary flag. Stage/score live on the lead, not the company — so a company can have several leads with different stakeholders. In the client store, `companies[]` items are lead views (`id` = lead id, `companyId` = company).
- The public portfolio owns `/` and bypasses the CRM shell; the authenticated dashboard lives at `/dashboard`, and auth returns there to keep the website and private workspace separate.
- Portfolio theme tokens are scoped to `.portfolio` so the website's theme switch cannot restyle the CRM.
- The portfolio contact form validates locally and prepares a mailto draft, never reports delivery; direct sending requires a configured mail service.
- Public website text lives in one `software.site_content` JSON row (id `landing`), read publicly via a server fn with defaults merged in, edited at `/website` by workspace admins — so missing fields never break the page.
- Landing slideshow metadata shares the site-content row; images live in private `website-slides` Storage with admin writes and published-only anonymous reads, resolved to signed URLs by the public content function — unpublished uploads stay private.
- Uploaded hero slides reserve image space outside the introduction through scoped portfolio CSS, while the original photo remains full-bleed — preserves uploaded images without destructive editing.

- In this combined workspace, shared database changes belong in root `supabase/migrations/`, not the app-local historical copy. Follow root `supabase/README.md`; Auth and Storage changes affect both apps.
