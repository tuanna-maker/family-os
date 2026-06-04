import { getSupabase } from "./get-client";

export type AppRole =
  | "super_admin"
  | "family_owner"
  | "family_member"
  | "security_admin"
  | "security_staff";

export type MyContext = {
  userId: string;
  email: string | null;
  profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
  roles: AppRole[];
  family: { id: string; name: string; apartment: string | null; owner_id: string } | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSecurity: boolean;
};

export async function requireUser() {
  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, userId: user.id, user };
}

export async function getMyContext(): Promise<MyContext> {
  const supabase = getSupabase();
  const { userId, user } = await requireUser();

  const [{ data: profile }, { data: rolesData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role, family_id").eq("user_id", userId),
  ]);

  const roles = (rolesData ?? []).map((r) => r.role as AppRole);

  let { data: family } = await supabase
    .from("families")
    .select("id, name, apartment, owner_id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!family) {
    const memberRole = (rolesData ?? []).find((r) => r.family_id);
    if (memberRole?.family_id) {
      const res = await supabase
        .from("families")
        .select("id, name, apartment, owner_id")
        .eq("id", memberRole.family_id)
        .maybeSingle();
      family = res.data ?? null;
    }
  }

  const isSecurity = roles.some((r) => r === "security_admin" || r === "security_staff");
  if (!family && !isSecurity) {
    const { data: created, error } = await supabase
      .from("families")
      .insert({
        name: profile?.full_name ? `Gia đình ${profile.full_name}` : "Gia đình của tôi",
        owner_id: userId,
      })
      .select("id, name, apartment, owner_id")
      .single();
    if (error) throw new Error(error.message);
    family = created;
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "family_owner",
      family_id: created.id,
    });
    roles.push("family_owner");
  }

  return {
    userId,
    email: user.email ?? null,
    profile: profile ?? null,
    roles,
    family,
    isAdmin: roles.includes("super_admin") || roles.includes("security_admin"),
    isSuperAdmin: roles.includes("super_admin"),
    isSecurity,
  };
}
