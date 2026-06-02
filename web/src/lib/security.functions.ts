import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sosDispatchSchema, SOS_SCHEMA_VERSION } from "@/features/security-ops/dashboard/sosSchema";

export type SecurityRequest = {
  id: string;
  request_type: string;
  status: string;
  building: string | null;
  apartment: string | null;
  requester_id: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  ticket_code: string | null;
  priority: string | null;
  incident_type: string | null;
  team_name: string | null;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
};

const TYPES = ["sos", "fire", "intrusion", "noise", "package", "other"] as const;

export const createSosDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sosDispatchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Unique short ticket code: SOS-YYMMDD-XXXX (base36 random)
    const now = new Date();
    const ymd =
      String(now.getUTCFullYear()).slice(-2) +
      String(now.getUTCMonth() + 1).padStart(2, "0") +
      String(now.getUTCDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const ticket_code = `SOS-${ymd}-${rand}`;

    // Schema already trimmed/normalized
    const zone = data.zone;
    const location = data.location ?? null;
    const note = data.note ?? null;

    // Standardized payload (schema v1) — keep all SOS fields fully structured
    // so reads don't have to guess shape, and DB columns stay semantically
    // correct (building = zone, apartment = location).
    const payload = {
      schema_version: SOS_SCHEMA_VERSION,
      ticket_code,
      priority: data.priority,
      incident_type: data.incident_type,
      zone,
      location,
      team: {
        id: data.team_id,
        name: data.team_name,
        auto_assigned: data.auto_assigned,
      },
      // Legacy flat fields kept for older readers
      team_id: data.team_id,
      team_name: data.team_name,
      auto_assigned: data.auto_assigned,
      note,
      dispatched_at: now.toISOString(),
      dispatched_by: userId,
    };

    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "sos",
        status: "open",
        building: zone,
        apartment: location,
        payload: payload as never,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);

    // Initial timeline event
    const dispatchNote =
      `Điều động ${data.team_name}${data.auto_assigned ? " (tự động)" : ""}` +
      (note ? ` · ${note}` : "");
    await supabase.from("sos_events").insert({
      request_id: row.id,
      actor_id: userId,
      event_type: "dispatched",
      to_status: "open",
      note: dispatchNote,
      metadata: {
        ticket_code,
        priority: data.priority,
        incident_type: data.incident_type,
        zone,
        location,
        team: { id: data.team_id, name: data.team_name, auto_assigned: data.auto_assigned },
      } as never,
    });

    return {
      id: row.id as string,
      ticket_code,
      created_at: row.created_at as string,
    };
  });


export const createSecurityRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        request_type: z.enum(TYPES),
        building: z.string().max(80).optional(),
        apartment: z.string().max(40).optional(),
        payload: z.record(z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: data.request_type,
        building: data.building ?? null,
        apartment: data.apartment ?? null,
        payload: (data.payload ?? {}) as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listSecurityRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecurityRequest[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, request_type, status, building, apartment, requester_id, assigned_to, payload, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const guardIds = Array.from(
      new Set(rows.map((r) => r.assigned_to).filter((v): v is string => !!v)),
    );
    let nameById = new Map<string, string>();
    if (guardIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", guardIds);
      nameById = new Map((profs ?? []).map((p) => [p.id as string, (p.full_name as string) ?? ""]));
    }
    return rows.map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const team = (p.team as Record<string, unknown> | undefined) ?? null;
      return {
        id: r.id as string,
        request_type: r.request_type as string,
        status: r.status as string,
        building: r.building as string | null,
        apartment: r.apartment as string | null,
        requester_id: r.requester_id as string | null,
        assigned_to: r.assigned_to as string | null,
        assigned_name: r.assigned_to ? nameById.get(r.assigned_to as string) ?? null : null,
        ticket_code: (p.ticket_code as string) ?? null,
        priority: (p.priority as string) ?? null,
        incident_type: (p.incident_type as string) ?? null,
        team_name: ((team?.name as string | undefined) ?? (p.team_name as string | undefined)) ?? null,
        note: (p.note as string) ?? null,
        created_at: r.created_at as string,
        resolved_at: r.resolved_at as string | null,
      };
    });
  });

export const updateSecurityRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "in_progress", "resolved", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("security_requests")
      .update({
        status: data.status,
        assigned_to: userId,
        resolved_at: data.status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: `security_request.${data.status}`,
      _target_table: "security_requests",
      _target_id: data.id,
      _metadata: {},
    });
    return { ok: true };
  });

export type OpenSosRow = {
  id: string;
  ticket_code: string;
  priority: "P1" | "P2" | "P3" | "—";
  incident_type: string;
  zone: string | null;
  location: string | null;
  team_name: string | null;
  status: string;
  created_at: string;
  age_seconds: number;
};

export const listOpenSos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OpenSosRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, building, apartment, created_at, payload")
      .eq("request_type", "sos")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const now = Date.now();
    return (data ?? []).map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const team = (p.team as Record<string, unknown> | undefined) ?? null;
      const priority = (p.priority as OpenSosRow["priority"]) ?? "—";
      return {
        id: r.id as string,
        ticket_code: (p.ticket_code as string) ?? `SOS-${String(r.id).slice(0, 6).toUpperCase()}`,
        priority,
        incident_type: (p.incident_type as string) ?? "Sự cố",
        zone: ((p.zone as string | undefined) ?? r.building) ?? null,
        location: ((p.location as string | undefined) ?? r.apartment) ?? null,
        team_name: ((team?.name as string | undefined) ?? (p.team_name as string | undefined)) ?? null,
        status: r.status as string,
        created_at: r.created_at as string,
        age_seconds: Math.max(0, Math.floor((now - new Date(r.created_at as string).getTime()) / 1000)),
      };
    });
  });


// ===== Security Core status for home page =====

export type SecurityTone = "success" | "warning" | "emergency" | "muted";

export type SecurityChip = {
  key: "camera" | "fire" | "elevator" | "intrusion" | "package" | "tech";
  label: string;
  value: string;
  tone: SecurityTone;
  count: number;
};

export type SecurityStatus = {
  overall: SecurityTone;
  headline: string;
  subline: string;
  updated_at: string | null;
  open_count: number;
  chips: SecurityChip[];
};

const CHIP_DEFS: Array<{
  key: SecurityChip["key"];
  label: string;
  okValue: string;
  types: ReadonlyArray<typeof TYPES[number]>;
}> = [
  { key: "camera", label: "Camera & An ninh", okValue: "Hoạt động", types: ["intrusion"] },
  { key: "fire", label: "PCCC", okValue: "Bình thường", types: ["fire"] },
  { key: "elevator", label: "Thang máy", okValue: "Bình thường", types: ["other"] },
];

export const getSecurityStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ family_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<SecurityStatus> => {
    const { supabase } = context;
    const fid = data.family_id;

    // 1) Resolve family member user ids
    const [{ data: fam }, { data: roles }] = await Promise.all([
      supabase.from("families").select("owner_id").eq("id", fid).maybeSingle(),
      supabase
        .from("user_roles")
        .select("user_id")
        .eq("family_id", fid)
        .in("role", ["family_owner", "family_member"]),
    ]);
    const userIds = new Set<string>();
    if (fam?.owner_id) userIds.add(fam.owner_id);
    for (const r of roles ?? []) if (r.user_id) userIds.add(r.user_id);

    // 2) Open/in-progress security requests from any family member
    let openReqs: Array<{
      request_type: string;
      status: string;
      created_at: string;
    }> = [];
    if (userIds.size > 0) {
      const { data: reqs } = await supabase
        .from("security_requests")
        .select("request_type, status, created_at")
        .in("requester_id", Array.from(userIds))
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(100);
      openReqs = reqs ?? [];
    }

    // 3) Elderly safety alerts → treat as emergency/warning signal
    const { data: elders } = await supabase
      .from("elderly_profiles")
      .select("safe_status, safe_last_at, name")
      .eq("family_id", fid);
    const elderAlerts = (elders ?? []).filter(
      (e) => e.safe_status === "alert" || e.safe_status === "warn",
    );

    // 4) Latest update timestamp
    const candidates: string[] = [];
    if (openReqs[0]?.created_at) candidates.push(openReqs[0].created_at);
    for (const e of elders ?? []) if (e.safe_last_at) candidates.push(e.safe_last_at);
    const updated_at = candidates.sort().reverse()[0] ?? null;

    // 5) Build chips
    const countByType = new Map<string, number>();
    for (const r of openReqs) {
      countByType.set(r.request_type, (countByType.get(r.request_type) ?? 0) + 1);
    }
    const sosCount = countByType.get("sos") ?? 0;

    const chips: SecurityChip[] = CHIP_DEFS.map((def) => {
      const count = def.types.reduce(
        (sum, t) => sum + (countByType.get(t) ?? 0),
        0,
      );
      // Camera chip also reflects SOS / intrusion alarms
      const effective = def.key === "camera" ? count + sosCount : count;
      if (effective > 0) {
        const tone: SecurityTone = def.key === "fire" ? "emergency" : "warning";
        return {
          key: def.key,
          label: def.label,
          value: `${effective} cảnh báo`,
          tone,
          count: effective,
        };
      }
      return {
        key: def.key,
        label: def.label,
        value: def.okValue,
        tone: "success",
        count: 0,
      };
    });

    // 6) Overall status
    const hasEmergency =
      sosCount > 0 ||
      (countByType.get("fire") ?? 0) > 0 ||
      elderAlerts.some((e) => e.safe_status === "alert");
    const hasWarning =
      openReqs.length > 0 || elderAlerts.length > 0;

    let overall: SecurityTone = "success";
    let headline = "Tất cả bình thường";
    let subline = "Không có cảnh báo đang mở";
    if (hasEmergency) {
      overall = "emergency";
      headline = "Cảnh báo khẩn cấp";
      subline = sosCount > 0
        ? `${sosCount} yêu cầu SOS đang mở`
        : (countByType.get("fire") ?? 0) > 0
          ? "Báo cháy chưa xử lý"
          : "Người thân cần hỗ trợ ngay";
    } else if (hasWarning) {
      overall = "warning";
      headline = "Có cảnh báo cần xem";
      subline = `${openReqs.length + elderAlerts.length} mục đang chờ xử lý`;
    }

    return {
      overall,
      headline,
      subline,
      updated_at,
      open_count: openReqs.length + elderAlerts.length,
      chips,
    };
  });


// ===== SOS status updates + timeline =====

export type SosEvent = {
  id: string;
  request_id: string;
  actor_id: string | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
};

const SOS_STATUSES = ["open", "in_progress", "resolved", "cancelled"] as const;
export type SosStatus = (typeof SOS_STATUSES)[number];

export const updateSosStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(SOS_STATUSES),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: current, error: readErr } = await supabase
      .from("security_requests")
      .select("status")
      .eq("id", data.id)
      .single();
    if (readErr) throw new Error(readErr.message);

    const { error } = await supabase
      .from("security_requests")
      .update({
        status: data.status,
        assigned_to: userId,
        resolved_at:
          data.status === "resolved" || data.status === "cancelled"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("sos_events").insert({
      request_id: data.id,
      actor_id: userId,
      event_type: "status_change",
      from_status: current?.status ?? null,
      to_status: data.status,
      note: data.note ?? null,
    });
    return { ok: true };
  });

export const addSosNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("sos_events").insert({
      request_id: data.id,
      actor_id: userId,
      event_type: "note",
      note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSosEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<SosEvent[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("sos_events")
      .select("id, request_id, actor_id, event_type, from_status, to_status, note, created_at")
      .eq("request_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as SosEvent[];
  });

// ===== Recent dispatch records (for SOC DispatchAssignmentsCard) =====

export type DispatchRow = {
  id: string;
  ticket_code: string;
  priority: "P1" | "P2" | "P3" | "—";
  incident_type: string;
  zone: string | null;
  location: string | null;
  team_id: string | null;
  team_name: string | null;
  auto_assigned: boolean;
  note: string | null;
  status: SosStatus;
  created_at: string;
};

export const listRecentDispatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DispatchRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, building, apartment, created_at, payload")
      .eq("request_type", "sos")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const team = (p.team as Record<string, unknown> | undefined) ?? null;
      return {
        id: r.id as string,
        ticket_code:
          (p.ticket_code as string) ??
          `SOS-${String(r.id).slice(0, 6).toUpperCase()}`,
        priority: ((p.priority as DispatchRow["priority"]) ?? "—"),
        incident_type: (p.incident_type as string) ?? "Sự cố",
        zone: ((p.zone as string | undefined) ?? r.building) ?? null,
        location: ((p.location as string | undefined) ?? r.apartment) ?? null,
        team_id:
          ((team?.id as string | undefined) ??
            (p.team_id as string | undefined)) ??
          null,
        team_name:
          ((team?.name as string | undefined) ??
            (p.team_name as string | undefined)) ??
          null,
        auto_assigned:
          ((team?.auto_assigned as boolean | undefined) ??
            (p.auto_assigned as boolean | undefined)) ??
          false,
        note: (p.note as string | null | undefined) ?? null,
        status: (r.status as SosStatus) ?? "open",
        created_at: r.created_at as string,
      };
    });
  });

// ===== KPI / SLA Report =====
export type SeverityBucket = { severity: string; count: number };
export type SlaBucket = {
  severity: string;
  total: number;
  resolved: number;
  avg_response_minutes: number | null;
  p90_response_minutes: number | null;
  sla_target_minutes: number;
  within_sla: number;
  sla_pct: number | null;
};
export type OpsKpiPrevious = {
  range_days: number;
  incidents_total: number;
  incidents_open: number;
  incidents_resolved: number;
  avg_resolution_minutes: number | null;
  sla_overall_pct: number | null;
  sla: SlaBucket[];
};
export type OpsKpiReport = {
  range_days: number;
  team: string | null;
  generated_at: string;
  incidents_total: number;
  incidents_open: number;
  incidents_resolved: number;
  by_severity: SeverityBucket[];
  sla: SlaBucket[];
  sla_overall_pct: number | null;
  shifts_today: number;
  shifts_checked_in: number;
  guards_on_duty: number;
  patrol_logs_today: number;
  patrol_points_today: number;
  avg_resolution_minutes: number | null;
  previous: OpsKpiPrevious | null;
};

const SLA_TARGETS: Record<string, number> = {
  critical: 5,
  high: 15,
  medium: 60,
  low: 240,
};

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? sorted[base] + rest * (next - sorted[base]) : sorted[base];
}

export const listOpsTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { supabase } = context;
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data, error } = await supabase
      .from("guard_shifts")
      .select("shift_type")
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of data ?? []) if (r.shift_type) set.add(r.shift_type as string);
    return Array.from(set).sort();
  });

export type SlaIncidentRow = {
  id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  location: string | null;
  created_at: string;
  resolved_at: string | null;
  response_minutes: number | null;
  sla_target_minutes: number;
  within_sla: boolean | null;
};

export const listSlaIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        severity: z.string().min(1).max(20),
        range_days: z.number().int().min(1).max(90).default(7),
        team: z.string().min(1).max(80).optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<SlaIncidentRow[]> => {
    const { supabase } = context;
    const since = new Date(Date.now() - data.range_days * 86400_000).toISOString();

    let teamGuardIds: string[] | null = null;
    if (data.team) {
      const { data: ts, error: tsErr } = await supabase
        .from("guard_shifts")
        .select("guard_id")
        .eq("shift_type", data.team)
        .gte("created_at", since);
      if (tsErr) throw new Error(tsErr.message);
      teamGuardIds = Array.from(
        new Set((ts ?? []).map((r) => r.guard_id as string).filter(Boolean)),
      );
      if (teamGuardIds.length === 0)
        teamGuardIds = ["00000000-0000-0000-0000-000000000000"];
    }

    const q = supabase
      .from("incidents")
      .select("id, title, type, severity, status, location, created_at, resolved_at")
      .eq("severity", data.severity)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (teamGuardIds) q.in("assigned_to", teamGuardIds);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const target = SLA_TARGETS[data.severity] ?? 60;
    return (rows ?? []).map((r) => {
      const isResolved = r.status === "resolved" || !!r.resolved_at;
      const mins =
        isResolved && r.resolved_at && r.created_at
          ? (new Date(r.resolved_at as string).getTime() -
              new Date(r.created_at as string).getTime()) /
            60000
          : null;
      return {
        id: r.id as string,
        title: (r.title as string) ?? "Sự cố",
        type: (r.type as string) ?? "",
        severity: r.severity as string,
        status: r.status as string,
        location: (r.location as string | null) ?? null,
        created_at: r.created_at as string,
        resolved_at: (r.resolved_at as string | null) ?? null,
        response_minutes:
          mins !== null && Number.isFinite(mins) ? Math.round(mins * 10) / 10 : null,
        sla_target_minutes: target,
        within_sla: mins !== null ? mins <= target : null,
      };
    });
  });

export const getOpsKpiReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        range_days: z.number().int().min(1).max(90).default(7),
        team: z.string().min(1).max(80).optional(),
        compare: z.boolean().default(false),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<OpsKpiReport> => {
    const { supabase } = context;
    const now = new Date();
    const rangeMs = data.range_days * 86400_000;
    const sinceDate = new Date(now.getTime() - rangeMs);
    const sinceIso = sinceDate.toISOString();
    const prevSinceIso = new Date(sinceDate.getTime() - rangeMs).toISOString();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const todayDate = todayIso.slice(0, 10);

    // Resolve team scope by shift_type → guard_ids active within current range.
    // Use the same guard cohort for the previous window to keep comparison consistent.
    let teamGuardIds: string[] | null = null;
    if (data.team) {
      const { data: ts, error: tsErr } = await supabase
        .from("guard_shifts")
        .select("guard_id")
        .eq("shift_type", data.team)
        .gte("created_at", sinceIso);
      if (tsErr) throw new Error(tsErr.message);
      teamGuardIds = Array.from(new Set((ts ?? []).map((r) => r.guard_id as string).filter(Boolean)));
      if (teamGuardIds.length === 0) teamGuardIds = ["00000000-0000-0000-0000-000000000000"];
    }

    async function fetchIncidentsWindow(fromIso: string, toIso: string) {
      const q = supabase
        .from("incidents")
        .select("id, severity, status, created_at, resolved_at, assigned_to")
        .gte("created_at", fromIso)
        .lt("created_at", toIso);
      if (teamGuardIds) q.in("assigned_to", teamGuardIds);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      return rows ?? [];
    }

    function computeIncidentStats(rows: Array<{ severity: string | null; status: string | null; created_at: string | null; resolved_at: string | null }>) {
      const bySev = new Map<string, { total: number; resolved: number; durs: number[] }>();
      let resolvedTotal = 0;
      let openTotal = 0;
      const allDurs: number[] = [];
      for (const i of rows) {
        const sev = (i.severity as string) || "medium";
        const b = bySev.get(sev) ?? { total: 0, resolved: 0, durs: [] };
        b.total += 1;
        if (i.status === "resolved" || i.resolved_at) {
          b.resolved += 1;
          resolvedTotal += 1;
          if (i.resolved_at && i.created_at) {
            const mins = (new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / 60000;
            if (mins >= 0 && Number.isFinite(mins)) {
              b.durs.push(mins);
              allDurs.push(mins);
            }
          }
        } else {
          openTotal += 1;
        }
        bySev.set(sev, b);
      }
      const sla: SlaBucket[] = Array.from(bySev.entries()).map(([severity, b]) => {
        const target = SLA_TARGETS[severity] ?? 60;
        const sorted = [...b.durs].sort((a, z) => a - z);
        const avg = sorted.length ? sorted.reduce((s, x) => s + x, 0) / sorted.length : null;
        const within = b.durs.filter((m) => m <= target).length;
        return {
          severity,
          total: b.total,
          resolved: b.resolved,
          avg_response_minutes: avg !== null ? Math.round(avg * 10) / 10 : null,
          p90_response_minutes: quantile(sorted, 0.9),
          sla_target_minutes: target,
          within_sla: within,
          sla_pct: b.resolved ? Math.round((within / b.resolved) * 1000) / 10 : null,
        };
      }).sort((a, z) => {
        const order = ["critical", "high", "medium", "low"];
        return order.indexOf(a.severity) - order.indexOf(z.severity);
      });
      const by_severity: SeverityBucket[] = Array.from(bySev.entries()).map(([severity, b]) => ({
        severity,
        count: b.total,
      }));
      const sortedAll = allDurs.sort((a, z) => a - z);
      const avgAll = sortedAll.length ? sortedAll.reduce((s, x) => s + x, 0) / sortedAll.length : null;
      const withinAll = sla.reduce((s, b) => s + b.within_sla, 0);
      const resolvedAll = sla.reduce((s, b) => s + b.resolved, 0);
      const sla_overall_pct = resolvedAll ? Math.round((withinAll / resolvedAll) * 1000) / 10 : null;
      return {
        total: rows.length,
        open: openTotal,
        resolved: resolvedTotal,
        avg: avgAll !== null ? Math.round(avgAll * 10) / 10 : null,
        sla,
        by_severity,
        sla_overall_pct,
      };
    }

    const shiftQ = supabase
      .from("guard_shifts")
      .select("id, guard_id, status, shift_date, shift_type")
      .eq("shift_date", todayDate);
    if (data.team) shiftQ.eq("shift_type", data.team);

    const patrolQ = supabase
      .from("patrol_logs")
      .select("checkpoint_code, scanned_at, shift_id, guard_id")
      .gte("scanned_at", todayIso);
    if (teamGuardIds) patrolQ.in("guard_id", teamGuardIds);

    const [curRows, prevRows, shiftRes, patrolRes] = await Promise.all([
      fetchIncidentsWindow(sinceIso, now.toISOString()),
      data.compare ? fetchIncidentsWindow(prevSinceIso, sinceIso) : Promise.resolve([]),
      shiftQ,
      patrolQ,
    ]);
    if (shiftRes.error) throw new Error(shiftRes.error.message);
    if (patrolRes.error) throw new Error(patrolRes.error.message);

    const cur = computeIncidentStats(curRows);
    const shifts = shiftRes.data ?? [];
    const patrols = patrolRes.data ?? [];

    const guards = new Set<string>();
    let checkedIn = 0;
    for (const s of shifts) {
      if (s.guard_id) guards.add(s.guard_id as string);
      if (s.status === "checked_in") checkedIn += 1;
    }

    let previous: OpsKpiPrevious | null = null;
    if (data.compare) {
      const prev = computeIncidentStats(prevRows);
      previous = {
        range_days: data.range_days,
        incidents_total: prev.total,
        incidents_open: prev.open,
        incidents_resolved: prev.resolved,
        avg_resolution_minutes: prev.avg,
        sla_overall_pct: prev.sla_overall_pct,
        sla: prev.sla,
      };
    }

    return {
      range_days: data.range_days,
      team: data.team ?? null,
      generated_at: now.toISOString(),
      incidents_total: cur.total,
      incidents_open: cur.open,
      incidents_resolved: cur.resolved,
      by_severity: cur.by_severity,
      sla: cur.sla,
      sla_overall_pct: cur.sla_overall_pct,
      shifts_today: shifts.length,
      shifts_checked_in: checkedIn,
      guards_on_duty: guards.size,
      patrol_logs_today: patrols.length,
      patrol_points_today: new Set(patrols.map((p) => p.checkpoint_code as string)).size,
      avg_resolution_minutes: cur.avg,
      previous,
    };
  });
