import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


export type GuardShift = {
  id: string;
  guard_id: string;
  project_id: string | null;
  shift_date: string;
  shift_type: "morning" | "afternoon" | "night";
  start_at: string;
  end_at: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: "scheduled" | "checked_in" | "checked_out" | "missed" | "cancelled";
  notes: string | null;
};

const locationSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    label: z.string().max(200).optional(),
    address: z.string().max(300).optional(),
  })
  .optional();

function inferShiftType(d: Date): "morning" | "afternoon" | "night" {
  const h = d.getHours();
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 22) return "afternoon";
  return "night";
}

function shiftBounds(d: Date, type: "morning" | "afternoon" | "night") {
  const base = new Date(d);
  base.setMinutes(0, 0, 0);
  const start = new Date(base);
  const end = new Date(base);
  if (type === "morning") { start.setHours(6); end.setHours(14); }
  else if (type === "afternoon") { start.setHours(14); end.setHours(22); }
  else { start.setHours(22); end.setDate(end.getDate() + 1); end.setHours(6); }
  return { start: start.toISOString(), end: end.toISOString() };
}

export const getActiveShift = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GuardShift | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("guard_shifts")
      .select("*")
      .eq("guard_id", userId)
      .in("status", ["scheduled", "checked_in"])
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as GuardShift | null) ?? null;
  });

export const checkInShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      location: locationSchema,
      notes: z.string().max(500).optional(),
      project_id: z.string().uuid().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const nowIso = now.toISOString();
    const today = nowIso.slice(0, 10);

    // Already checked-in? reuse.
    const { data: active } = await supabase
      .from("guard_shifts")
      .select("id")
      .eq("guard_id", userId)
      .eq("status", "checked_in")
      .limit(1)
      .maybeSingle();
    if (active) return { id: active.id as string, reused: true };

    // Try latest scheduled shift today
    const { data: scheduled } = await supabase
      .from("guard_shifts")
      .select("id")
      .eq("guard_id", userId)
      .eq("status", "scheduled")
      .eq("shift_date", today)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scheduled) {
      const { error } = await supabase
        .from("guard_shifts")
        .update({
          status: "checked_in",
          check_in_at: nowIso,
          check_in_location: data.location ?? null,
          notes: data.notes ?? null,
        })
        .eq("id", scheduled.id);
      if (error) throw new Error(error.message);
      return { id: scheduled.id as string, reused: false };
    }

    // Ad-hoc shift created on check-in
    const type = inferShiftType(now);
    const { start, end } = shiftBounds(now, type);
    const { data: created, error } = await supabase
      .from("guard_shifts")
      .insert({
        guard_id: userId,
        project_id: data.project_id ?? null,
        shift_date: today,
        shift_type: type,
        start_at: start,
        end_at: end,
        check_in_at: nowIso,
        check_in_location: data.location ?? null,
        status: "checked_in",
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string, reused: false };
  });

export const checkOutShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      location: locationSchema,
      notes: z.string().max(500).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: active, error: readErr } = await supabase
      .from("guard_shifts")
      .select("id, notes")
      .eq("guard_id", userId)
      .eq("status", "checked_in")
      .order("check_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!active) throw new Error("Bạn chưa có ca trực đang mở để kết thúc");

    const merged = data.notes
      ? [active.notes, data.notes].filter(Boolean).join("\n")
      : active.notes;
    const { error } = await supabase
      .from("guard_shifts")
      .update({
        status: "checked_out",
        check_out_at: new Date().toISOString(),
        check_out_location: data.location ?? null,
        notes: merged ?? null,
      })
      .eq("id", active.id);
    if (error) throw new Error(error.message);
    return { id: active.id as string };
  });

export const listMyShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GuardShift[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("guard_shifts")
      .select("*")
      .eq("guard_id", userId)
      .order("start_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as GuardShift[];
  });

// ===== Patrol =====
export type PatrolLog = {
  id: string;
  guard_id: string;
  shift_id: string | null;
  project_id: string | null;
  route_code: string | null;
  checkpoint_code: string;
  scanned_at: string;
  scan_method: "qr" | "nfc" | "manual";
  location: { lat: number; lng: number; accuracy?: number; label?: string } | null;
  photo_url: string | null;
  notes: string | null;
};

export const logPatrolCheckpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      checkpoint_code: z.string().min(1).max(100),
      route_code: z.string().max(100).optional(),
      scan_method: z.enum(["qr", "nfc", "manual"]).default("qr"),
      location: locationSchema,
      notes: z.string().max(500).optional(),
      photo_url: z.string().url().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<PatrolLog> => {
    const { supabase, userId } = context;
    const { data: active } = await supabase
      .from("guard_shifts")
      .select("id, project_id")
      .eq("guard_id", userId)
      .eq("status", "checked_in")
      .order("check_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("patrol_logs")
      .insert({
        guard_id: userId,
        shift_id: active?.id ?? null,
        project_id: active?.project_id ?? null,
        checkpoint_code: data.checkpoint_code,
        route_code: data.route_code ?? null,
        scan_method: data.scan_method,
        scanned_at: new Date().toISOString(),
        location: data.location ?? null,
        notes: data.notes ?? null,
        photo_url: data.photo_url ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted as PatrolLog;
  });

export const listPatrolLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      shift_id: z.string().uuid().optional(),
      scope: z.enum(["mine", "shift", "today"]).default("today"),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<PatrolLog[]> => {
    const { supabase, userId } = context;
    let q = supabase
      .from("patrol_logs")
      .select("*")
      .eq("guard_id", userId)
      .order("scanned_at", { ascending: false })
      .limit(100);

    if (data.scope === "shift" && data.shift_id) {
      q = q.eq("shift_id", data.shift_id);
    } else if (data.scope === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      q = q.gte("scanned_at", start.toISOString());
    }
    const { error, data: rows } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as PatrolLog[];
  });


// ===== Guard Resident Requests (security_requests) =====
export type GuardRequestRow = {
  id: string;
  request_type: string;
  status: string;
  building: string | null;
  apartment: string | null;
  assigned_to: string | null;
  requester_id: string | null;
  created_at: string;
  resolved_at: string | null;
  ticket_code: string | null;
  priority: string | null;
  incident_type: string | null;
  team_name: string | null;
  note: string | null;
};

export const listGuardRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      scope: z.enum(["open", "mine", "resolved"]).default("open"),
      limit: z.number().min(1).max(100).default(50),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<GuardRequestRow[]> => {
    const { supabase, userId } = context;
    let q = supabase
      .from("security_requests")
      .select("id, request_type, status, building, apartment, assigned_to, requester_id, payload, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.scope === "open") q = q.in("status", ["open", "in_progress"]);
    else if (data.scope === "mine") q = q.eq("assigned_to", userId).in("status", ["open", "in_progress"]);
    else q = q.eq("status", "resolved");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const team = (p.team as Record<string, unknown> | undefined) ?? null;
      return {
        id: r.id as string,
        request_type: r.request_type as string,
        status: r.status as string,
        building: r.building as string | null,
        apartment: r.apartment as string | null,
        assigned_to: r.assigned_to as string | null,
        requester_id: r.requester_id as string | null,
        created_at: r.created_at as string,
        resolved_at: r.resolved_at as string | null,
        ticket_code: (p.ticket_code as string) ?? null,
        priority: (p.priority as string) ?? null,
        incident_type: (p.incident_type as string) ?? null,
        team_name: ((team?.name as string | undefined) ?? (p.team_name as string | undefined)) ?? null,
        note: (p.note as string) ?? null,
      };
    });
  });

async function notifyRequester(opts: {
  requesterId: string | null;
  requestId: string;
  type: string;
  title: string;
  body: string;
}) {
  if (!opts.requesterId) return;
  await supabaseAdmin.from("notifications").upsert(
    {
      user_id: opts.requesterId,
      type: opts.type,
      ref_id: opts.requestId,
      title: opts.title,
      body: opts.body,
      dedupe_key: `${opts.type}:${opts.requestId}`,
    },
    { onConflict: "user_id,dedupe_key" },
  );
}

export const claimGuardRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("security_requests")
      .update({ assigned_to: userId, status: "in_progress" })
      .eq("id", data.id)
      .select("id, requester_id, request_type")
      .single();
    if (error) throw new Error(error.message);
    // Timeline + notification
    await Promise.all([
      supabase.from("sos_events").insert({
        request_id: data.id,
        actor_id: userId,
        event_type: "claimed",
        to_status: "in_progress",
        note: "Bảo vệ đã nhận xử lý",
      }),
      notifyRequester({
        requesterId: updated.requester_id as string | null,
        requestId: data.id,
        type: "security_request.claimed",
        title: "Bảo vệ đang xử lý",
        body: "Yêu cầu bảo an của bạn đã được tiếp nhận.",
      }),
    ]);
    return { ok: true };
  });

export const resolveGuardRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("security_requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("id, requester_id")
      .single();
    if (error) throw new Error(error.message);
    await Promise.all([
      supabase.from("sos_events").insert({
        request_id: data.id,
        actor_id: userId,
        event_type: "resolved",
        to_status: "resolved",
        note: data.note ?? "Đã hoàn tất",
      }),
      notifyRequester({
        requesterId: updated.requester_id as string | null,
        requestId: data.id,
        type: "security_request.resolved",
        title: "Yêu cầu đã hoàn tất",
        body: data.note ?? "Bảo vệ đã hoàn tất xử lý yêu cầu của bạn.",
      }),
    ]);
    return { ok: true };
  });

// ===== Request detail + progress notes =====
export type GuardRequestDetail = {
  id: string;
  request_type: string;
  status: string;
  building: string | null;
  apartment: string | null;
  assigned_to: string | null;
  requester_id: string | null;
  created_at: string;
  resolved_at: string | null;
  payload: Record<string, any>;
};
export type GuardRequestEvent = {
  id: string;
  event_type: string;
  to_status: string | null;
  from_status: string | null;
  note: string | null;
  actor_id: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
};

export const getGuardRequestDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ request: GuardRequestDetail; events: GuardRequestEvent[] }> => {
    const { supabase } = context;
    const { data: req, error } = await supabase
      .from("security_requests")
      .select("id, request_type, status, building, apartment, assigned_to, requester_id, payload, created_at, resolved_at")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: events } = await supabase
      .from("sos_events")
      .select("id, event_type, to_status, from_status, note, actor_id, created_at, metadata")
      .eq("request_id", data.id)
      .order("created_at", { ascending: true });
    return {
      request: {
        ...(req as Omit<GuardRequestDetail, "payload">),
        payload: (req.payload ?? {}) as Record<string, any>,
      },
      events: (events ?? []) as GuardRequestEvent[],
    };
  });

export const addGuardRequestNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().min(1).max(1000) }).parse(d),
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

// ===== Incidents =====
export const createIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      type: z.string().min(1).max(50),
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      location: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: shift } = await supabase
      .from("guard_shifts")
      .select("project_id")
      .eq("guard_id", userId)
      .eq("status", "checked_in")
      .limit(1)
      .maybeSingle();
    const { data: inserted, error } = await supabase
      .from("incidents")
      .insert({
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        severity: data.severity,
        location: data.location ?? null,
        reporter_id: userId,
        project_id: shift?.project_id ?? null,
        status: "open",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id as string };
  });

// ===== Shift range (for schedule week view) =====
export const listShiftsRange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      from: z.string(),
      to: z.string(),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<GuardShift[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("guard_shifts")
      .select("*")
      .eq("guard_id", userId)
      .gte("shift_date", data.from)
      .lte("shift_date", data.to)
      .order("start_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as GuardShift[];
  });
