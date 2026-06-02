import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Cross-schema (household, platform) tables/RPCs are not in generated types.
// Cast to any for those calls; auth + RLS still enforced server-side.
const admin = supabaseAdmin as any;

function buildWebUrl(token: string): string {
  const origin =
    getRequestHeader("origin") ||
    (getRequestHeader("host") ? `https://${getRequestHeader("host")}` : "https://stoslife.lovable.app");
  return `${origin.replace(/\/$/, "")}/gia-dinh/invite/${token}`;
}

// =====================================================
// household.createInvite
// =====================================================
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      householdId: z.string().uuid(),
      role: z.enum(["family_owner", "family_member"]).default("family_member"),
      invitedEmail: z.string().email().max(255).optional(),
      invitedPhone: z.string().min(8).max(20).optional(),
      expiresInDays: z.number().int().min(1).max(30).default(7),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Verify caller is owner of the household
    const { data: fam, error: famErr } = await supabase
      .from("families")
      .select("id, owner_id")
      .eq("id", data.householdId)
      .maybeSingle();
    if (famErr) throw new Error(famErr.message);
    if (!fam) throw new Error("Household not found or no access");
    if (fam.owner_id !== userId) {
      throw new Error("Only the household owner can create invites");
    }

    // 2. Generate token
    const { data: token, error: tokErr } = await admin
      .schema("household")
      .rpc("gen_invite_token");
    if (tokErr || !token) throw new Error("Failed to generate invite token");

    // 3. Insert invite via admin (RLS allows but admin keeps it simple)
    const expiresAt = new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString();
    const { data: inv, error: insErr } = await admin
      .schema("household")
      .from("invite")
      .insert({
        household_id: data.householdId,
        token,
        invited_by: userId,
        invited_email: data.invitedEmail ?? null,
        invited_phone: data.invitedPhone ?? null,
        role: data.role,
        expires_at: expiresAt,
      })
      .select("id, token, expires_at")
      .single();
    if (insErr) throw new Error(insErr.message);

    // 4. Audit
    await admin.schema("platform").rpc("write_audit", {
      _action: "invite.created",
      _resource_type: "household.invite",
      _resource_id: inv.id,
      _household_id: data.householdId,
      _before: null,
      _after: { role: data.role, email: data.invitedEmail, phone: data.invitedPhone },
      _reason: null,
    });

    return {
      inviteId: inv.id as string,
      token: inv.token as string,
      expiresAt: inv.expires_at as string,
      deepLink: `vn.unicom.stos.family://invite/${inv.token}`,
      webUrl: buildWebUrl(inv.token as string),
    };
  });

// =====================================================
// household.acceptInvite
// =====================================================
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      token: z.string().min(32).max(128),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: inv, error: invErr } = await admin
      .schema("household")
      .from("invite")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (invErr) throw new Error(invErr.message);
    if (!inv) throw new Error("Invite không tồn tại hoặc đã bị huỷ");
    if (inv.accepted_at) throw new Error("Invite đã được dùng");
    if (inv.revoked_at) throw new Error("Invite đã bị huỷ");
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      throw new Error("Invite đã hết hạn");
    }
    if (inv.invited_by === userId) {
      throw new Error("Bạn không thể chấp nhận lời mời do chính mình tạo");
    }

    // Add to user_roles
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert(
        { user_id: userId, family_id: inv.household_id, role: inv.role },
        { onConflict: "user_id,family_id,role" },
      );
    if (roleErr) throw new Error(roleErr.message);

    // Mark invite accepted
    const { error: updErr } = await admin
      .schema("household")
      .from("invite")
      .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", inv.id);
    if (updErr) throw new Error(updErr.message);

    // Recompute members_count
    const { count } = await admin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("family_id", inv.household_id)
      .in("role", ["family_owner", "family_member"]);

    await admin
      .schema("household")
      .from("family_quota")
      .update({ members_count: count ?? 0 })
      .eq("household_id", inv.household_id);

    await admin.schema("platform").rpc("write_audit", {
      _action: "invite.accepted",
      _resource_type: "household.invite",
      _resource_id: inv.id,
      _household_id: inv.household_id,
      _before: null,
      _after: { accepted_by: userId, role: inv.role },
      _reason: null,
    });

    // Notify the inviter so they see the new member in-app
    try {
      await admin.from("notifications").insert({
        user_id: inv.invited_by,
        family_id: inv.household_id,
        type: "family.invite.accepted",
        ref_id: inv.id,
        title: "Lời mời đã được chấp nhận",
        body: "Một thành viên mới vừa tham gia hộ gia đình.",
        dedupe_key: `invite-accepted:${inv.id}`,
      });
    } catch {
      // notifications are best-effort
    }

    return {
      householdId: inv.household_id as string,
      role: inv.role as string,
    };
  });

// =====================================================
// household.listInvites
// =====================================================
export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ householdId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const sb = supabase as any;
    const { data: rows, error } = await sb
      .schema("household")
      .from("invite")
      .select(
        "id, token, role, invited_email, invited_phone, expires_at, accepted_at, accepted_by, revoked_at, created_at",
      )
      .eq("household_id", data.householdId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      token: string;
      role: string;
      invited_email: string | null;
      invited_phone: string | null;
      expires_at: string;
      accepted_at: string | null;
      accepted_by: string | null;
      revoked_at: string | null;
      created_at: string;
    }>;
  });

// =====================================================
// household.revokeInvite
// =====================================================
export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ inviteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sb = supabase as any;
    const { data: prev } = await sb
      .schema("household")
      .from("invite")
      .select("id, household_id, invited_by, invited_email, invited_phone")
      .eq("id", data.inviteId)
      .maybeSingle();
    const { error } = await sb
      .schema("household")
      .from("invite")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.inviteId)
      .is("accepted_at", null);
    if (error) throw new Error(error.message);
    if (prev) {
      try {
        await admin.from("notifications").insert({
          user_id: prev.invited_by ?? userId,
          family_id: prev.household_id,
          type: "family.invite.revoked",
          ref_id: prev.id,
          title: "Lời mời đã bị huỷ",
          body: prev.invited_email || prev.invited_phone || "Một lời mời vừa được huỷ.",
          dedupe_key: `invite-revoked:${prev.id}`,
        });
      } catch {
        // best-effort
      }
    }
    return { ok: true };
  });

// =====================================================
// household.getQuota
// =====================================================
export const getQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ householdId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const sb = supabase as any;
    const { data: q, error } = await sb
      .schema("household")
      .from("family_quota")
      .select("*")
      .eq("household_id", data.householdId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return q as {
      household_id: string;
      storage_used_bytes: number;
      storage_limit_bytes: number;
      members_count: number;
      members_limit: number;
      notifications_month: number;
      notifications_limit: number;
    } | null;
  });

// =====================================================
// household.getInvitePreview — PUBLIC (no auth required)
// Returns minimal, non-sensitive info to render the accept screen.
// =====================================================
export const getInvitePreview = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ token: z.string().min(32).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: inv, error } = await admin
      .schema("household")
      .from("invite")
      .select("id, household_id, role, invited_email, invited_phone, expires_at, accepted_at, revoked_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) {
      return { status: "not_found" as const };
    }
    if (inv.revoked_at) return { status: "revoked" as const };
    if (inv.accepted_at) return { status: "accepted" as const };
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      return { status: "expired" as const };
    }

    // Fetch household name (public-safe field)
    const { data: fam } = await admin
      .from("families")
      .select("name, apartment")
      .eq("id", inv.household_id)
      .maybeSingle();

    return {
      status: "valid" as const,
      role: inv.role as string,
      invitedEmail: inv.invited_email as string | null,
      invitedPhone: inv.invited_phone as string | null,
      expiresAt: inv.expires_at as string,
      household: {
        id: inv.household_id as string,
        name: (fam?.name as string | undefined) ?? "Hộ gia đình",
        apartment: (fam?.apartment as string | null) ?? null,
      },
    };
  });
