import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

/**
 * Get the current user's context: profile, roles, default family.
 * Auto-creates a family on first call so the family-core UX has a home.
 */
export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyContext> => {
    const { supabase, userId, claims } = context;

    const [{ data: profile }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role, family_id").eq("user_id", userId),
    ]);

    const roles = (rolesData ?? []).map((r) => r.role as AppRole);

    // Find an owned family or any family the user belongs to
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

    // Auto-create a family for security/family roles users; security_* don't need one
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
      email: (claims.email as string) ?? null,
      profile: profile ?? null,
      roles,
      family,
      isAdmin: roles.includes("super_admin") || roles.includes("security_admin"),
      isSuperAdmin: roles.includes("super_admin"),
      isSecurity,
    };
  });

/**
 * Throws if the caller is not an admin. Call from beforeLoad on /admin routes.
 */
export const requireAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin", "security_admin"]);
    if (!data || data.length === 0) {
      throw new Error("Forbidden: admin role required");
    }
    return { ok: true as const };
  });

/**
 * Bootstrap: first signed-in user with no super_admin in the system claims super_admin.
 * Idempotent and safe — if any super_admin already exists, nothing happens.
 */
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) > 0) return { ok: false as const, reason: "exists" as const };
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "super_admin" });
    if (error) return { ok: false as const, reason: error.message };
    await supabase.rpc("log_audit", {
      _action: "claim_super_admin",
      _target_table: "user_roles",
      _target_id: userId,
      _metadata: {},
    });
    return { ok: true as const };
  });
