import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = supabaseAdmin as any;

export type FamilyMemberRow = {
  user_id: string;
  role: "family_owner" | "family_member";
  is_owner: boolean;
  is_self: boolean;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
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

    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("family_id", data.familyId)
      .in("role", ["family_owner", "family_member"]);
    if (rolesErr) throw new Error(rolesErr.message);

    // Always include the owner even if no user_roles entry yet
    const map = new Map<string, { role: string; created_at: string | null }>();
    for (const r of roles ?? []) {
      const prev = map.get(r.user_id);
      // family_owner wins over family_member
      if (!prev || r.role === "family_owner") {
        map.set(r.user_id, { role: r.role, created_at: r.created_at });
      }
    }
    if (!map.has(fam.owner_id)) {
      map.set(fam.owner_id, { role: "family_owner", created_at: null });
    }

    const userIds = Array.from(map.keys());
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, full_name, email, username, avatar_url")
      .in("id", userIds);
    if (profErr) throw new Error(profErr.message);

    const profMap = new Map<string, {
      full_name: string | null;
      email: string | null;
      username: string | null;
      avatar_url: string | null;
    }>();
    for (const p of (profiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      username: string | null;
      avatar_url: string | null;
    }>) {
      profMap.set(p.id, p);
    }

    const rows: FamilyMemberRow[] = userIds.map((uid) => {
      const r = map.get(uid)!;
      const p = profMap.get(uid);
      const isOwner = uid === fam.owner_id;
      return {
        user_id: uid,
        role: isOwner ? "family_owner" : (r.role as "family_owner" | "family_member"),
        is_owner: isOwner,
        is_self: uid === userId,
        full_name: p?.full_name ?? null,
        email: p?.email ?? null,
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        joined_at: r.created_at,
      };
    });

    // Owner first, then by joined_at
    rows.sort((a, b) => {
      if (a.is_owner) return -1;
      if (b.is_owner) return 1;
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
