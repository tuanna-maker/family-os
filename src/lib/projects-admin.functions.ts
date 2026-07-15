import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "security_admin", "saas_admin"]);
  if (!data || data.length === 0) throw new Error("Forbidden: admin role required");
}

async function logAudit(
  actorId: string,
  action: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: "projects",
    target_id: targetId,
    metadata: metadata as any,
  });
}

export const adminListProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id, code, name, city, address, status, tenant_id, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { projects: data ?? [] };
  });

const projectInput = z.object({
  code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/, "Mã chỉ gồm chữ, số, _ và -"),
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["active", "pending", "archived"]).default("active"),
});

async function getDefaultTenantId() {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Chưa có tenant trong hệ thống");
  return data.id;
}

export const adminCreateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const tenantId = await getDefaultTenantId();
    const { data: dup } = await supabaseAdmin
      .from("projects")
      .select("id")
      .ilike("code", data.code)
      .maybeSingle();
    if (dup) throw new Error(`DUPLICATE_CODE:Mã "${data.code}" đã tồn tại`);
    const { data: row, error } = await supabaseAdmin
      .from("projects")
      .insert({
        tenant_id: tenantId,
        code: data.code,
        name: data.name,
        city: data.city ?? null,
        address: data.address ?? null,
        status: data.status,
      })
      .select("id")
      .single();
    if (error) {
      if ((error as any).code === "23505")
        throw new Error(`DUPLICATE_CODE:Mã "${data.code}" đã tồn tại`);
      throw new Error(error.message);
    }
    await logAudit(context.userId, "project.create", row.id, {
      code: data.code,
      name: data.name,
      city: data.city ?? null,
      status: data.status,
    });
    return { id: row.id };
  });

export const adminUpdateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    projectInput.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { data: dup } = await supabaseAdmin
      .from("projects")
      .select("id")
      .ilike("code", rest.code)
      .neq("id", id)
      .maybeSingle();
    if (dup) throw new Error(`DUPLICATE_CODE:Mã "${rest.code}" đã tồn tại`);
    const { error } = await supabaseAdmin
      .from("projects")
      .update({
        code: rest.code,
        name: rest.name,
        city: rest.city ?? null,
        address: rest.address ?? null,
        status: rest.status,
      })
      .eq("id", id);
    if (error) {
      if ((error as any).code === "23505")
        throw new Error(`DUPLICATE_CODE:Mã "${rest.code}" đã tồn tại`);
      throw new Error(error.message);
    }
    await logAudit(context.userId, "project.update", id, {
      code: rest.code,
      name: rest.name,
      city: rest.city ?? null,
      status: rest.status,
    });
    return { ok: true };
  });


export const adminSetProjectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["active", "pending", "archived"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("projects")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "project.set_status", data.id, { status: data.status });
    return { ok: true };
  });

export const adminDeleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: existing } = await supabaseAdmin
      .from("projects")
      .select("code, name")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "project.delete", data.id, existing ?? {});
    return { ok: true };
  });

export const adminGetProjectDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, code, name, city, address, status, tenant_id, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Không tìm thấy chung cư");

    const { data: logs } = await supabaseAdmin
      .from("audit_logs")
      .select("id, action, actor_id, metadata, created_at")
      .eq("target_table", "projects")
      .eq("target_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const actorIds = Array.from(
      new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean) as string[]),
    );
    let actors: Record<string, { name: string | null; email: string | null }> = {};
    if (actorIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds);
      actors = Object.fromEntries(
        (profs ?? []).map((p) => [
          p.id,
          { name: p.full_name, email: (p.email as any) ?? null },
        ]),
      );
    }

    return { project, logs: logs ?? [], actors };
  });
