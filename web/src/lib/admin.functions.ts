import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "./auth.functions";

const ROLES: AppRole[] = [
  "super_admin",
  "family_owner",
  "family_member",
  "security_admin",
  "security_staff",
];

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "security_admin"]);
  if (!data || data.length === 0) throw new Error("Forbidden");
  return (data as { role: AppRole }[]).map((r) => r.role);
}

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (pErr) throw new Error(pErr.message);

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role, family_id")
      .in("user_id", ids);

    return (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
    }));
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        target_user_id: z.string().uuid(),
        role: z.enum(ROLES as [AppRole, ...AppRole[]]),
        family_id: z.string().uuid().nullable().optional(),
        action: z.enum(["grant", "revoke"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const callerRoles = await assertAdmin(supabase, userId);
    // Only super_admin can grant/revoke super_admin
    if (data.role === "super_admin" && !callerRoles.includes("super_admin")) {
      throw new Error("Forbidden: only super_admin can manage super_admin");
    }

    if (data.action === "grant") {
      const { error } = await supabase.from("user_roles").insert({
        user_id: data.target_user_id,
        role: data.role,
        family_id: data.family_id ?? null,
      });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const q = supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.target_user_id)
        .eq("role", data.role);
      if (data.family_id) q.eq("family_id", data.family_id);
      const { error } = await q;
      if (error) throw new Error(error.message);
    }

    await supabase.rpc("log_audit", {
      _action: `role.${data.action}`,
      _target_table: "user_roles",
      _target_id: data.target_user_id,
      _metadata: { role: data.role, family_id: data.family_id ?? null },
    });
    return { ok: true };
  });

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata_json: string | null;
  created_at: string;
};

export type AuditLogsResult = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  page_size: number;
};

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        from: z.string().datetime().nullable().optional(),
        to: z.string().datetime().nullable().optional(),
        actor_id: z.string().uuid().nullable().optional(),
        action: z.string().min(1).max(120).nullable().optional(),
        page: z.number().int().min(1).default(1),
        page_size: z.number().int().min(5).max(200).default(25),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<AuditLogsResult> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const fromIdx = (data.page - 1) * data.page_size;
    const toIdx = fromIdx + data.page_size - 1;

    let q = supabase
      .from("audit_logs")
      .select("id, actor_id, action, target_table, target_id, metadata, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(fromIdx, toIdx);

    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.actor_id) q = q.eq("actor_id", data.actor_id);
    if (data.action) q = q.ilike("action", `%${data.action}%`);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const actorIds = Array.from(
      new Set((rows ?? []).map((r) => r.actor_id).filter((v): v is string => !!v)),
    );
    const actorMap = new Map<string, string>();
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);
      (profs ?? []).forEach((p) => actorMap.set(p.id, p.full_name ?? ""));
    }

    return {
      rows: (rows ?? []).map((r) => ({
        id: r.id,
        actor_id: r.actor_id,
        actor_name: r.actor_id ? actorMap.get(r.actor_id) ?? null : null,
        action: r.action,
        target_table: r.target_table,
        target_id: r.target_id,
        metadata_json: r.metadata ? JSON.stringify(r.metadata) : null,
        created_at: r.created_at,
      })),
      total: count ?? 0,
      page: data.page,
      page_size: data.page_size,
    };
  });

export const listAuditActors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data } = await supabase
      .from("audit_logs")
      .select("actor_id")
      .not("actor_id", "is", null)
      .limit(500);
    const ids = Array.from(new Set((data ?? []).map((r) => r.actor_id as string)));
    if (!ids.length) return [] as { id: string; full_name: string | null }[];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    return (profs ?? []).map((p) => ({ id: p.id, full_name: p.full_name }));
  });

