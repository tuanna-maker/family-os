import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = supabaseAdmin as any;

export type FamilyMemberRow = {
  id: string;
  user_id: string | null;
  role: "family_owner" | "family_member";
  is_owner: boolean;
  is_self: boolean;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  member_role: string | null;
  age: number | null;
  joined_at: string | null;
};

async function assertOwner(familyId: string, userId: string) {
  const { data: fam, error } = await admin
    .from("families")
    .select("id, owner_id")
    .eq("id", familyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!fam) throw new Error("Hộ gia đình không tồn tại");
  if (fam.owner_id !== userId) throw new Error("Chỉ chủ hộ mới có quyền này");
  return fam;
}

export const listFamilyMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is a member (RLS-enforced via families select)
    const { data: fam, error: famErr } = await supabase
      .from("families")
      .select("id, owner_id, name")
      .eq("id", data.familyId)
      .maybeSingle();
    if (famErr) throw new Error(famErr.message);
    if (!fam) throw new Error("Bạn không thuộc hộ này");

    const [{ data: roster, error: rosterErr }, { data: roles, error: rolesErr }] = await Promise.all([
      admin
        .from("family_members")
        .select("id, user_id, name, member_role, age, avatar, created_at")
        .eq("family_id", data.familyId)
        .order("created_at"),
      admin
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("family_id", data.familyId)
        .in("role", ["family_owner", "family_member"]),
    ]);
    if (rosterErr) throw new Error(rosterErr.message);
    if (rolesErr) throw new Error(rolesErr.message);

    const roleMap = new Map<string, { role: "family_owner" | "family_member"; created_at: string | null }>();
    for (const r of roles ?? []) {
      if (!r.user_id) continue;
      const role = (r.role as "family_owner" | "family_member") ?? "family_member";
      const prev = roleMap.get(r.user_id);
      if (!prev || role === "family_owner") {
        roleMap.set(r.user_id, { role, created_at: r.created_at });
      }
    }
    if (fam.owner_id && !roleMap.has(fam.owner_id)) {
      roleMap.set(fam.owner_id, { role: "family_owner", created_at: null });
    }

    const rosterList = roster ?? [];
    const linkedUserIds = new Set(
      rosterList.map((r: { user_id: string | null }) => r.user_id).filter((id: string | null): id is string => !!id),
    );

    const allUserIds = Array.from(new Set([...linkedUserIds, ...roleMap.keys()]));
    const profMap = new Map<string, {
      full_name: string | null;
      email: string | null;
      username: string | null;
      avatar_url: string | null;
    }>();
    if (allUserIds.length > 0) {
      const { data: profiles, error: profErr } = await admin
        .from("profiles")
        .select("id, full_name, email, username, avatar_url")
        .in("id", allUserIds);
      if (profErr) throw new Error(profErr.message);
      for (const p of (profiles ?? []) as Array<{
        id: string;
        full_name: string | null;
        email: string | null;
        username: string | null;
        avatar_url: string | null;
      }>) {
        profMap.set(p.id, p);
      }
    }

    const rows: FamilyMemberRow[] = rosterList.map((r: {
      id: string;
      user_id: string | null;
      name: string | null;
      member_role: string | null;
      age: number | null;
      avatar: string | null;
      created_at: string | null;
    }) => {
      const p = r.user_id ? profMap.get(r.user_id) : null;
      const isOwner = r.user_id === fam.owner_id || r.member_role === "owner";
      const rosterName = (r.name as string)?.trim() || null;
      return {
        id: r.id,
        user_id: r.user_id,
        role: isOwner ? "family_owner" : "family_member",
        is_owner: isOwner,
        is_self: !!r.user_id && r.user_id === userId,
        full_name: rosterName ?? p?.full_name ?? null,
        email: p?.email ?? null,
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? r.avatar ?? null,
        member_role: r.member_role,
        age: r.age,
        joined_at: r.created_at,
      };
    });

    for (const [uid, r] of roleMap.entries()) {
      if (linkedUserIds.has(uid)) continue;
      const p = profMap.get(uid);
      const isOwner = uid === fam.owner_id;
      rows.push({
        id: uid,
        user_id: uid,
        role: isOwner ? "family_owner" : r.role,
        is_owner: isOwner,
        is_self: uid === userId,
        full_name: p?.full_name ?? null,
        email: p?.email ?? null,
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        member_role: isOwner ? "owner" : "member",
        age: null,
        joined_at: r.created_at,
      });
    }

    rows.sort((a, b) => {
      if (a.is_owner) return -1;
      if (b.is_owner) return 1;
      const order = (role: string | null) => {
        if (role === "member") return 0;
        if (role === "child") return 1;
        if (role === "elderly") return 2;
        return 3;
      };
      const diff = order(a.member_role) - order(b.member_role);
      if (diff !== 0) return diff;
      return (a.joined_at ?? "").localeCompare(b.joined_at ?? "");
    });

    return {
      family: { id: fam.id as string, name: fam.name as string, owner_id: fam.owner_id as string },
      members: rows,
      isOwner: fam.owner_id === userId,
    };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      familyId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      role: z.enum(["family_owner", "family_member"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const fam = await assertOwner(data.familyId, userId);
    if (data.targetUserId === fam.owner_id) {
      throw new Error("Không thể đổi vai trò của chủ hộ");
    }

    // Remove other role variants for this user in this family, then upsert new
    const { error: delErr } = await admin
      .from("user_roles")
      .delete()
      .eq("family_id", data.familyId)
      .eq("user_id", data.targetUserId)
      .in("role", ["family_owner", "family_member"]);
    if (delErr) throw new Error(delErr.message);

    const { error: insErr } = await admin
      .from("user_roles")
      .insert({ user_id: data.targetUserId, family_id: data.familyId, role: data.role });
    if (insErr) throw new Error(insErr.message);

    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      familyId: z.string().uuid(),
      targetUserId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const fam = await assertOwner(data.familyId, userId);
    if (data.targetUserId === fam.owner_id) {
      throw new Error("Không thể gỡ chủ hộ ra khỏi gia đình");
    }
    const { error } = await admin
      .from("user_roles")
      .delete()
      .eq("family_id", data.familyId)
      .eq("user_id", data.targetUserId)
      .in("role", ["family_owner", "family_member"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const leaveFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ familyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: fam, error: famErr } = await admin
      .from("families")
      .select("owner_id")
      .eq("id", data.familyId)
      .maybeSingle();
    if (famErr) throw new Error(famErr.message);
    if (!fam) throw new Error("Hộ gia đình không tồn tại");
    if (fam.owner_id === userId) {
      throw new Error("Chủ hộ không thể tự rời. Hãy chuyển quyền chủ hộ trước.");
    }
    const { error } = await admin
      .from("user_roles")
      .delete()
      .eq("family_id", data.familyId)
      .eq("user_id", userId)
      .in("role", ["family_owner", "family_member"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
