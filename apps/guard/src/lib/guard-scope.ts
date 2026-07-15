import type { SupabaseClient } from "@supabase/supabase-js";

export type GuardScope = {
  user_id: string;
  project_id: string | null;
  tenant_id: string | null;
  tenant_ids: string[];
  /** user_id + mọi tenant_id (dữ liệu legacy guard_id = tenant_id) */
  lookup_guard_ids: string[];
};

export async function resolveGuardScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<GuardScope> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("project_id, tenant_id")
    .eq("user_id", userId)
    .in("role", ["security_admin", "security_staff"]);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const tenant_ids = [
    ...new Set(rows.map((r) => r.tenant_id as string | null).filter(Boolean) as string[]),
  ];
  const row = rows.find((r) => r.project_id) ?? rows[0];
  const lookup_guard_ids = [...new Set([userId, ...tenant_ids])];

  return {
    user_id: userId,
    project_id: (row?.project_id as string | null) ?? null,
    tenant_id: tenant_ids[0] ?? null,
    tenant_ids,
    lookup_guard_ids,
  };
}

export function localDateIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
