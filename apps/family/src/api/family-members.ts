import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type FamilyMemberRow = {
  user_id: string;
  role: "family_owner" | "family_member";
  is_owner: boolean;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  joined_at: string | null;
};

export async function listFamilyMembers(data: { family_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z.object({ family_id: z.string().uuid() }).parse(data);

  const [{ data: fam, error: famErr }, { data: roles, error: rolesErr }] = await Promise.all([
    supabase
      .from("families")
      .select("id, owner_id, name")
      .eq("id", parsed.family_id)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("family_id", parsed.family_id)
      .in("role", ["family_owner", "family_member"]),
  ]);

  if (famErr) throw new Error(famErr.message);
  if (!fam) throw new Error("Bạn không thuộc hộ này");
  if (rolesErr) throw new Error(rolesErr.message);

  const map = new Map<string, { role: "family_owner" | "family_member"; created_at: string | null }>();
  for (const r of roles ?? []) {
    if (!r.user_id) continue;
    const role = (r.role as "family_owner" | "family_member") ?? "family_member";
    const prev = map.get(r.user_id);
    // family_owner wins over family_member
    if (!prev || role === "family_owner") {
      map.set(r.user_id, { role, created_at: (r as any).created_at ?? null });
    }
  }
  if (fam.owner_id && !map.has(fam.owner_id)) {
    map.set(fam.owner_id, { role: "family_owner", created_at: null });
  }

  const userIds = Array.from(map.keys());
  if (userIds.length === 0) {
    return { family: { id: fam.id as string, name: fam.name as string, owner_id: fam.owner_id as string }, members: [] as FamilyMemberRow[] };
  }

  const { data: profiles, error: profErr } = await supabase
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
  for (const p of (profiles ?? []) as Array<any>) {
    profMap.set(p.id, p);
  }

  const rows: FamilyMemberRow[] = userIds.map((uid) => {
    const r = map.get(uid)!;
    const p = profMap.get(uid);
    const isOwner = uid === fam.owner_id;
    return {
      user_id: uid,
      role: isOwner ? "family_owner" : r.role,
      is_owner: isOwner,
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
      username: p?.username ?? null,
      avatar_url: p?.avatar_url ?? null,
      joined_at: r.created_at,
    };
  });

  rows.sort((a, b) => {
    if (a.is_owner) return -1;
    if (b.is_owner) return 1;
    return (a.joined_at ?? "").localeCompare(b.joined_at ?? "");
  });

  return {
    family: { id: fam.id as string, name: fam.name as string, owner_id: fam.owner_id as string },
    members: rows,
  };
}

