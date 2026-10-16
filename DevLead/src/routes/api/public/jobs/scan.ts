import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

// Called by an external scheduler every 30 minutes. Requires the shared secret header.
async function handle(request: Request) {
  const secret = process.env["JOB_SCAN_SECRET"];
  const given = request.headers.get("x-scan-secret") ?? new URL(request.url).searchParams.get("key") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runScanForAll } = await import("@/lib/jobs/scan.server");
  const results = await runScanForAll(supabaseAdmin);
  return Response.json({ ok: true, workspaces: results.map((r) => ({ status: r.status, fetched: r.fetched, matched: r.matched, newPostings: r.newPostings, leadsCreated: r.leadsCreated })) });
}

export const Route = createFileRoute("/api/public/jobs/scan")({
  server: { handlers: { POST: ({ request }) => handle(request), GET: ({ request }) => handle(request) } },
});
