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

<!-- LOVABLE:BEGIN-SUPABASE -->
> [!IMPORTANT]
> This project is connected to an external Supabase project (ref `rtaszifelvzbvcbqgrig`), so
> Lovable Cloud is not used and the Lovable auth broker (`lovable.auth`) does not serve it.
> Sign-in goes through Supabase Auth directly.

- App-internal server logic uses `createServerFn` from `@tanstack/react-start`, not Supabase Edge Functions.
- Browser code imports `supabase` from `@/integrations/supabase/client`; signed-in server logic uses
  `.middleware([requireSupabaseAuth])` from `@/integrations/supabase/auth-middleware`; service-role
  access (`supabaseAdmin`) is loaded inside a handler with `await import("@/integrations/supabase/client.server")`
  so it never enters the client bundle.
- All database changes go through the migration tool; never hand-edit `src/integrations/supabase/types.ts`.
<!-- LOVABLE:END-SUPABASE -->

- All app data lives in the `realestate` schema on the external CRM Supabase project, never `public`; browser reads go through `supabase.schema("realestate")` (see src/lib/data.ts), and `realestate` must stay in the API exposed-schemas list.

- In this combined workspace, shared database changes belong in root `supabase/migrations/`, not the app-local historical copy. Follow root `supabase/README.md`; Auth and Storage changes affect both apps.
