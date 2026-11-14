/**
 * Workspace membership actions.
 *
 * Membership changes are privileged: the database blocks direct edits of
 * `profiles.workspace_id`, so joining, creating and removing all run here,
 * after the caller has been verified.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function makeCode() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
}

/** Create a brand new workspace and make the caller its admin. */
export const createWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => {
    const name = (data?.name ?? "").trim();
    if (name.length < 2) throw new Error("Please enter a workspace name");
    return { name: name.slice(0, 80) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { ensureTalentProfile } = await import("@/lib/talent-profile.server");
    const profile = await ensureTalentProfile(userId);
    if (profile.workspace_id) throw new Error("You already belong to a workspace");

    const { data: ws, error } = await supabaseAdmin
      .from("workspace")
      .insert({ workspace_name: data.name, workspace_admins: [userId], created_by: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: linkError } = await supabaseAdmin
      .from("profiles")
      .update({ workspace_id: ws.id })
      .eq("id", profile.id);
    if (linkError) throw new Error(linkError.message);

    return { workspaceId: ws.id, workspaceName: ws.workspace_name };
  });

/** Join a workspace using an invitation code. */
export const redeemInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => {
    const code = (data?.code ?? "").trim();
    if (!code) throw new Error("Please enter an invitation code");
    return { code };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { ensureTalentProfile } = await import("@/lib/talent-profile.server");
    const profile = await ensureTalentProfile(userId);
    if (profile.workspace_id) throw new Error("You already belong to a workspace");

    const { data: invite } = await supabaseAdmin
      .from("workspace_invitations")
      .select("*")
      .eq("code", data.code)
      .maybeSingle();
    if (!invite) throw new Error("This invitation code is not valid");
    if (invite.revoked) throw new Error("This invitation has been revoked");
    if (invite.used_by) throw new Error("This invitation has already been used");
    if (new Date(invite.expires_at) < new Date()) throw new Error("This invitation has expired");

    const { error: linkError } = await supabaseAdmin
      .from("profiles")
      .update({ workspace_id: invite.workspace_id })
      .eq("id", profile.id);
    if (linkError) throw new Error(linkError.message);

    await supabaseAdmin
      .from("workspace_invitations")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    const { data: ws } = await supabaseAdmin
      .from("workspace")
      .select("id, workspace_name")
      .eq("id", invite.workspace_id)
      .maybeSingle();

    return { workspaceId: invite.workspace_id, workspaceName: ws?.workspace_name ?? "" };
  });

/** Admin-only: create a new invitation code for the caller's workspace. */
export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    email: z.union([z.string().trim().email().max(254), z.literal("")]).default(""),
    days: z.number().int().min(1).max(90).default(14),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("workspace_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const workspaceId = profile?.workspace_id;
    if (!workspaceId) throw new Error("You do not belong to a workspace");

    const { data: isAdmin } = await context.supabase.rpc("is_workspace_admin", {
      _workspace_id: workspaceId,
    });
    if (!isAdmin) throw new Error("Only workspace admins can invite people");

    const { invitationEmailConfig, sendInvitationEmail } = await import("@/lib/invitation-email.server");
    // Check configuration before creating a record, so missing credentials do not create duplicates.
    const emailConfig = data.email ? invitationEmailConfig() : null;
    const expires = new Date(Date.now() + data.days * 24 * 60 * 60 * 1000).toISOString();
    const { data: row, error } = await context.supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        code: makeCode(),
        created_by: context.userId,
        email: data.email,
        expires_at: expires,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (emailConfig) {
      try {
        await sendInvitationEmail(emailConfig, row);
        return { invitation: row, emailStatus: "sent" as const };
      } catch (error) {
        // The invitation remains usable if delivery fails or its outcome is uncertain.
        const emailError = error instanceof Error && error.message.startsWith("Resend")
          ? error.message
          : "Could not confirm email delivery. Check the server's connection to Resend.";
        return { invitation: row, emailStatus: "failed" as const, emailError };
      }
    }
    return { invitation: row, emailStatus: "not_requested" as const };
  });

/** Admin-only: remove a member from the caller's workspace. */
export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { profileId: string }) => {
    if (!data?.profileId) throw new Error("Missing member");
    return { profileId: data.profileId };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("remove_workspace_member", { _profile_id: data.profileId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
