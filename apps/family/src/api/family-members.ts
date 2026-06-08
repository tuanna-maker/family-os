import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type FamilyMemberRow = {
  id: string;
  user_id: string | null;
  role: "family_owner" | "family_member";
  is_owner: boolean;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  member_role: string | null;
  age: number | null;
  joined_at: string | null;
};

export async function listFamilyMembers(data: { family_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z.object({ family_id: z.string().uuid() }).parse(data);

  const [{ data: fam, error: famErr }, { data: roster, error: rosterErr }, { data: roles, error: rolesErr }] =
    await Promise.all([
      supabase
        .from("families")
        .select("id, owner_id, name")
        .eq("id", parsed.family_id)
        .maybeSingle(),
      supabase
        .from("family_members")
        .select("id, user_id, name, member_role, age, avatar, created_at")
        .eq("family_id", parsed.family_id)
        .order("created_at"),
      supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("family_id", parsed.family_id)
        .in("role", ["family_owner", "family_member"]),
    ]);

  if (famErr) throw new Error(famErr.message);
  if (!fam) throw new Error("Bạn không thuộc hộ này");
  if (rosterErr) throw new Error(rosterErr.message);
  if (rolesErr) throw new Error(rolesErr.message);

  const roleMap = new Map<string, { role: "family_owner" | "family_member"; created_at: string | null }>();
  for (const r of roles ?? []) {
    if (!r.user_id) continue;
    const role = (r.role as "family_owner" | "family_member") ?? "family_member";
    const prev = roleMap.get(r.user_id);
    if (!prev || role === "family_owner") {
      roleMap.set(r.user_id, { role, created_at: (r as { created_at?: string }).created_at ?? null });
    }
  }
  if (fam.owner_id && !roleMap.has(fam.owner_id)) {
    roleMap.set(fam.owner_id, { role: "family_owner", created_at: null });
  }

  const rosterList = roster ?? [];
  const linkedUserIds = new Set(
    rosterList.map((r) => r.user_id).filter((id): id is string => !!id),
  );

  const allUserIds = Array.from(
    new Set([...linkedUserIds, ...roleMap.keys()]),
  );

  const profMap = new Map<
    string,
    { full_name: string | null; email: string | null; username: string | null; avatar_url: string | null }
  >();
  if (allUserIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
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

  const rows: FamilyMemberRow[] = rosterList.map((r) => {
    const p = r.user_id ? profMap.get(r.user_id) : null;
    const isOwner = r.user_id === fam.owner_id || r.member_role === "owner";
    const rosterName = (r.name as string)?.trim() || null;
    return {
      id: r.id as string,
      user_id: (r.user_id as string | null) ?? null,
      role: isOwner ? "family_owner" : "family_member",
      is_owner: isOwner,
      full_name: rosterName ?? p?.full_name ?? null,
      email: p?.email ?? null,
      username: p?.username ?? null,
      avatar_url: p?.avatar_url ?? (r.avatar as string | null) ?? null,
      member_role: (r.member_role as string | null) ?? null,
      age: (r.age as number | null) ?? null,
      joined_at: (r.created_at as string | null) ?? null,
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
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
      username: p?.username ?? null,
      avatar_url: p?.avatar_url ?? null,
      member_role: isOwner ? "owner" : "member",
      age: null,
      joined_at: r.created_at,
    });
  }

  if (rows.length === 0 && fam.owner_id) {
    const p = profMap.get(fam.owner_id);
    rows.push({
      id: fam.owner_id,
      user_id: fam.owner_id,
      role: "family_owner",
      is_owner: true,
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
      username: p?.username ?? null,
      avatar_url: p?.avatar_url ?? null,
      member_role: "owner",
      age: null,
      joined_at: null,
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
  };
}
