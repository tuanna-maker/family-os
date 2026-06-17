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
      .select("id, request_type, status, building, apartment, requester_id, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
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

    // 2) Security requests not yet finished (whole family)
    let openReqs: Array<{
      request_type: string;
      status: string;
      created_at: string;
    }> = [];
    {
      const { data: reqs } = await supabase
        .from("security_requests")
        .select("request_type, status, created_at")
        .eq("family_id", fid)
        // Treat anything not resolved/cancelled as still needing attention.
        // (Some deployments add intermediate states like "assigned"/"pending".)
        .not("status", "in", "(resolved,cancelled)")
        .order("created_at", { ascending: false })
        .limit(100);
      const nowMs = Date.now();
      const STALE_REQ_MS = 24 * 60 * 60 * 1000; // 24h: tránh cảnh báo treo mãi do request cũ không được đóng
      openReqs = (reqs ?? []).filter((r) => {
        const t = new Date(r.created_at).getTime();
        return Number.isFinite(t) ? nowMs - t <= STALE_REQ_MS : true;
      });
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
    for (const e of elders ?? []) {
      // Only surface elderly timestamps when there is an alert/warn.
      if ((e.safe_status === "alert" || e.safe_status === "warn") && e.safe_last_at) {
        candidates.push(e.safe_last_at);
      }
    }
    let updated_at = candidates.sort().reverse()[0] ?? null;

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

    // Triệt để: nếu trạng thái an toàn (success) thì không hiển thị "Cập nhật <date>".
    if (!hasEmergency && !hasWarning) {
      updated_at = null;
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
