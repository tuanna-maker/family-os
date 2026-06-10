import type { SupabaseClient } from "@supabase/supabase-js";

export type ResidentScope = {
  apartment_id: string;
  project_id: string;
  tenant_id: string;
  block_id: string | null;
  family_id: string | null;
};

const UNLINKED_MSG =
  "Tài khoản của bạn chưa được liên kết với căn hộ. Vui lòng liên hệ Ban Quản Lý để được cập nhật.";

function mapScopeRow(row: Record<string, string | null>): ResidentScope {
  return {
    apartment_id: row.apartment_id!,
    project_id: row.project_id!,
    tenant_id: row.tenant_id ?? "",
    block_id: row.block_id ?? null,
    family_id: row.family_id ?? null,
  };
}

async function resolveResidentScopeFromTables(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResidentScope> {
  const { data: roles } = await supabase.from("user_roles").select("family_id").eq("user_id", userId);

  let familyId = (roles ?? []).find((r) => r.family_id)?.family_id ?? null;
  if (!familyId) {
    const { data: owned } = await supabase.from("families").select("id").eq("owner_id", userId).maybeSingle();
    familyId = owned?.id ?? null;
  }
  if (!familyId) throw new Error(UNLINKED_MSG);

  const { data: resident, error } = await supabase
    .from("apartment_residents")
    .select("family_id, apartment_id")
    .eq("family_id", familyId)
    .is("move_out_date", null)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!resident?.apartment_id) throw new Error(UNLINKED_MSG);

  const { data: apt, error: aptErr } = await supabase
    .from("apartments")
    .select("id, project_id, block_id, projects(tenant_id)")
    .eq("id", resident.apartment_id)
    .maybeSingle();

  if (aptErr) throw new Error(aptErr.message);
  if (!apt?.project_id) throw new Error(UNLINKED_MSG);

  const project = apt.projects as { tenant_id: string } | null;

  return {
    apartment_id: apt.id,
    project_id: apt.project_id,
    tenant_id: project?.tenant_id ?? "",
    block_id: apt.block_id ?? null,
    family_id: resident.family_id,
  };
}

export async function resolveResidentScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResidentScope> {
  const { data, error } = await supabase.rpc("resolve_user_primary_apartment", {
    _user_id: userId,
  });

  if (!error) {
    const row = (data ?? [])[0] as Record<string, string | null> | undefined;
    if (row?.apartment_id && row?.project_id) return mapScopeRow(row);
    throw new Error(UNLINKED_MSG);
  }

  const msg = error.message ?? "";
  if (msg.includes("permission denied") || msg.includes("does not exist")) {
    return resolveResidentScopeFromTables(supabase, userId);
  }

  throw new Error(msg);
}
