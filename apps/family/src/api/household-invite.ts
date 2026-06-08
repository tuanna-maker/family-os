import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";
import { listFamilyMembers } from "./family-members";

const WEB_ORIGIN = "https://stoslife.lovable.app";

export type HouseholdInviteRow = {
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
};

export type FamilyQuotaRow = {
  household_id: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  members_count: number;
  members_limit: number;
  notifications_month: number;
  notifications_limit: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function householdClient(supabase: any) {
  return supabase.schema("household");
}

export function inviteWebUrl(token: string) {
  return `${WEB_ORIGIN}/gia-dinh/invite/${token}`;
}

export async function listHouseholdInvites(data: { household_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z.object({ household_id: z.string().uuid() }).parse(data);
  const { data: rows, error } = await householdClient(supabase)
    .from("invite")
    .select(
      "id, token, role, invited_email, invited_phone, expires_at, accepted_at, accepted_by, revoked_at, created_at",
    )
    .eq("household_id", parsed.household_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (rows ?? []) as HouseholdInviteRow[];
}

export async function getFamilyQuota(data: { household_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z.object({ household_id: z.string().uuid() }).parse(data);
  const [{ data: q, error }, membersResult] = await Promise.all([
    householdClient(supabase)
      .from("family_quota")
      .select("*")
      .eq("household_id", parsed.household_id)
      .maybeSingle(),
    listFamilyMembers({ family_id: parsed.household_id }).catch(() => null),
  ]);
  if (error) throw new Error(error.message);
  if (!q) return null;
  const quota = q as FamilyQuotaRow;
  const liveCount = membersResult?.members?.length;
  if (liveCount != null && liveCount >= 0) {
    return { ...quota, members_count: liveCount };
  }
  return quota;
}

export async function createHouseholdInvite(data: {
  household_id: string;
  invited_email?: string;
  invited_phone?: string;
  expires_in_days?: number;
  role?: "family_owner" | "family_member";
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      household_id: z.string().uuid(),
      invited_email: z.string().email().max(255).optional(),
      invited_phone: z.string().min(8).max(20).optional(),
      expires_in_days: z.number().int().min(1).max(30).default(7),
      role: z.enum(["family_owner", "family_member"]).default("family_member"),
    })
    .parse(data);

  const { data: fam, error: famErr } = await supabase
    .from("families")
    .select("id, owner_id")
    .eq("id", parsed.household_id)
    .maybeSingle();
  if (famErr) throw new Error(famErr.message);
  if (!fam) throw new Error("Không tìm thấy hộ gia đình");
  if (fam.owner_id !== userId) throw new Error("Chỉ chủ hộ mới được tạo lời mời");

  const { data: token, error: tokErr } = await householdClient(supabase).rpc("gen_invite_token");
  if (tokErr || !token) throw new Error("Không tạo được mã mời");

  const expiresAt = new Date(Date.now() + parsed.expires_in_days * 86_400_000).toISOString();
  const { data: inv, error: insErr } = await householdClient(supabase)
    .from("invite")
    .insert({
      household_id: parsed.household_id,
      token,
      invited_by: userId,
      invited_email: parsed.invited_email ?? null,
      invited_phone: parsed.invited_phone ?? null,
      role: parsed.role,
      expires_at: expiresAt,
    })
    .select("id, token, expires_at")
    .single();
  if (insErr) throw new Error(insErr.message);

  const webUrl = inviteWebUrl(inv.token as string);
  return {
    invite_id: inv.id as string,
    token: inv.token as string,
    expires_at: inv.expires_at as string,
    web_url: webUrl,
    deep_link: `vn.unicom.stos.family://invite/${inv.token}`,
  };
}

export async function revokeHouseholdInvite(data: { invite_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z.object({ invite_id: z.string().uuid() }).parse(data);
  const { error } = await householdClient(supabase)
    .from("invite")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.invite_id)
    .is("accepted_at", null);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
