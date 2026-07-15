import type { SupabaseClient } from "@supabase/supabase-js";

export type ResidentScope = {
  apartment_id: string;
  project_id: string;
  tenant_id: string;
  block_id: string | null;
  family_id: string | null;
};

/**
 * Resolve the signed-in resident's primary apartment + project scope.
 * Used by resident-facing security service handlers so every insert into
 * security_requests is bound to a tenant/project the user actually belongs to.
 *
 * Throws a user-friendly error when the caller has no apartment link, so the
 * UI can prompt them to contact BQL instead of leaking a raw RLS error.
 */
export async function resolveResidentScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResidentScope> {
  const { data, error } = await supabase.rpc("resolve_user_primary_apartment", {
    _user_id: userId,
  });
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  if (!row || !row.apartment_id || !row.project_id) {
    throw new Error(
      "Tài khoản của bạn chưa được liên kết với căn hộ. Vui lòng liên hệ Ban Quản Lý để được cập nhật.",
    );
  }
  return {
    apartment_id: row.apartment_id,
    project_id: row.project_id,
    tenant_id: row.tenant_id,
    block_id: row.block_id ?? null,
    family_id: row.family_id ?? null,
  };
}
