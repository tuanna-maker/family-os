import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type VisitorPass = {
  id: string;
  pass_code: string;
  guest_name: string;
  guest_phone: string | null;
  purpose: string | null;
  valid_from: string;
  valid_until: string;
  status: string;
  scanned_at: string | null;
  created_at: string;
};

async function defaultProjectId(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]) {
  const { data } = await supabase.from("projects").select("id").limit(1).maybeSingle();
  return data?.id as string | undefined;
}

export async function listVisitorPasses(data: { family_id: string }) {
  const { supabase, userId } = await requireUser();
  const { family_id } = z.object({ family_id: z.string().uuid() }).parse(data);
  const { data: rows, error } = await (supabase as any)
    .from("visitor_passes")
    .select(
      "id,pass_code,guest_name,guest_phone,purpose,valid_from,valid_until,status,scanned_at,created_at",
    )
    .eq("family_id", family_id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (rows ?? []) as VisitorPass[];
}

export async function createVisitorPass(data: {
  family_id: string;
  guest_name: string;
  guest_phone?: string;
  purpose?: string;
  valid_hours?: number;
  max_uses?: number;
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      guest_name: z.string().min(1).max(120),
      guest_phone: z.string().max(32).optional(),
      purpose: z.string().max(200).optional(),
      valid_hours: z.number().min(1).max(168).default(24),
    })
    .parse(data);
  const until = new Date(Date.now() + parsed.valid_hours * 3600000).toISOString();
  const project_id = await defaultProjectId(supabase);
  const { data: row, error } = await (supabase as any)
    .from("visitor_passes")
    .insert({
      host_user_id: userId,
      family_id: parsed.family_id,
      project_id: project_id ?? null,
      guest_name: parsed.guest_name,
      guest_phone: parsed.guest_phone ?? null,
      purpose: parsed.purpose ?? null,
      valid_until: until,
      status: "active",
    })
    .select("id, pass_code, guest_name, valid_until")
    .single();
  if (error) throw new Error(error.message);
  return row as { id: string; pass_code: string; guest_name: string; valid_until: string };
}

export async function revokeVisitorPass(data: { id: string }) {
  const { supabase } = await requireUser();
  const { id } = z.object({ id: z.string().uuid() }).parse(data);
  const { error } = await (supabase as any)
    .from("visitor_passes")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Quét mã khách tại cổng — ghi nhận lượt vào. */
export async function scanVisitorPass(data: { pass_code: string }) {
  const { supabase, userId } = await requireUser();
  const code = z.string().min(4).max(128).parse(data.pass_code).trim();
  const { data: row, error } = await (supabase as any)
    .from("visitor_passes")
    .select("id,pass_code,guest_name,status,valid_until,valid_from")
    .eq("pass_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Không tìm thấy mã khách");
  if (row.status === "revoked") throw new Error("Mã đã bị thu hồi");
  if (row.status === "used") throw new Error("Mã đã được quét trước đó");
  const now = Date.now();
  if (new Date(row.valid_until).getTime() < now) throw new Error("Mã đã hết hạn");
  if (new Date(row.valid_from).getTime() > now) throw new Error("Mã chưa có hiệu lực");
  const { error: uErr } = await (supabase as any)
    .from("visitor_passes")
    .update({
      status: "used",
      scanned_at: new Date().toISOString(),
      scanned_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (uErr) throw new Error(uErr.message);
  return {
    ok: true,
    guest_name: row.guest_name as string,
    pass_code: row.pass_code as string,
  };
}
