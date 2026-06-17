import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";
import { localDateIso, resolveGuardScope } from "@/lib/guard-scope";

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

const locationSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    label: z.string().max(200).optional(),
    address: z.string().max(300).optional(),
  })
  .optional();

const STALE_AUTO_CLOSE_NOTE = "Tự động kết thúc ca — quá giờ kết thúc ca trực.";

/** Thời điểm kết thúc ca (ưu tiên end_at; ca đêm có thể sang ngày hôm sau). */
export function resolveShiftEnd(shift: Pick<GuardShift, "end_at" | "shift_date" | "shift_type">): Date {
  if (shift.end_at) {
    const endAt = new Date(shift.end_at);
    if (!Number.isNaN(endAt.getTime())) return endAt;
  }
  const dateStr = shift.shift_date?.slice(0, 10) ?? localDateIso();
  const [y, m, d] = dateStr.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  switch (shift.shift_type) {
    case "morning":
      end.setHours(14, 0, 0, 0);
      break;
    case "afternoon":
      end.setHours(22, 0, 0, 0);
      break;
    case "night":
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
      break;
    default:
      end.setHours(23, 59, 59, 999);
  }
  return end;
}

/** Ca checked_in còn trong giờ trực (kể cả ca đêm qua nửa đêm). */
export function isOnDutyShift(shift: GuardShift, now = new Date()): boolean {
  return shift.status === "checked_in" && resolveShiftEnd(shift).getTime() > now.getTime();
}

/** Đã quá giờ kết thúc ca (dùng khi query không trả status). */
function isShiftPastEnd(
  shift: Pick<GuardShift, "end_at" | "shift_date" | "shift_type">,
  now = new Date(),
): boolean {
  return resolveShiftEnd(shift).getTime() <= now.getTime();
}

async function closeStaleOpenShifts(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  lookupGuardIds: string[],
  now = new Date(),
) {
  const { data: openRows, error } = await supabase
    .from("guard_shifts")
    .select("id, end_at, shift_date, shift_type, notes, check_in_at")
    .in("guard_id", lookupGuardIds)
    .eq("status", "checked_in");
  if (error) throw new Error(error.message);
  if (!openRows?.length) return;

  for (const row of openRows) {
    const shift = row as GuardShift;
    if (!isShiftPastEnd(shift, now)) continue;

    const merged = [shift.notes, STALE_AUTO_CLOSE_NOTE].filter(Boolean).join("\n");
    const checkOutAt =
      shift.end_at ??
      resolveShiftEnd(shift).toISOString();

    const { error: updErr } = await supabase
      .from("guard_shifts")
      .update({
        status: "checked_out",
        check_out_at: checkOutAt,
        notes: merged || null,
      })
      .eq("id", shift.id);
    if (updErr) throw new Error(updErr.message);
  }
}

async function findOpenOnDutyShift(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  lookupGuardIds: string[],
  now = new Date(),
): Promise<GuardShift | null> {
  const { data: openRows, error } = await supabase
    .from("guard_shifts")
    .select("*")
    .in("guard_id", lookupGuardIds)
    .eq("status", "checked_in")
    .order("check_in_at", { ascending: false });
  if (error) throw new Error(error.message);
  for (const row of openRows ?? []) {
    const shift = row as GuardShift;
    if (isOnDutyShift(shift, now)) return shift;
  }
  return null;
}

async function listMyShiftsRpc(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  scope: Awaited<ReturnType<typeof resolveGuardScope>>,
  range?: { from?: string; to?: string },
) {
  const { data, error } = await supabase.rpc("list_my_guard_shifts", {
    _from: range?.from ?? null,
    _to: range?.to ?? null,
    _limit: 90,
  });
  const rpcRows = (data ?? []) as GuardShift[];
  if (!error && rpcRows.length > 0) return rpcRows;

  const q = supabase
    .from("guard_shifts")
    .select("*")
    .in("guard_id", scope.lookup_guard_ids)
    .order("shift_date", { ascending: false })
    .order("start_at", { ascending: false })
    .limit(90);
  if (range?.from) q.gte("shift_date", range.from);
  if (range?.to) q.lte("shift_date", range.to);
  const { data: rows, error: qErr } = await q;
  if (qErr) throw new Error(qErr.message);
  return (rows ?? []) as GuardShift[];
}

export async function getActiveShift(): Promise<GuardShift | null> {
  const { supabase, userId } = await requireUser();
  const scope = await resolveGuardScope(supabase, userId);
  const now = new Date();

  await closeStaleOpenShifts(supabase, scope.lookup_guard_ids, now);

  const onDuty = await findOpenOnDutyShift(supabase, scope.lookup_guard_ids, now);
  if (onDuty) return onDuty;

  const today = localDateIso(now);
  const { data: scheduled, error: schedErr } = await supabase
    .from("guard_shifts")
    .select("*")
    .in("guard_id", scope.lookup_guard_ids)
    .eq("status", "scheduled")
    .eq("shift_date", today)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (schedErr) throw new Error(schedErr.message);
  if (scheduled) return scheduled as GuardShift;

  const { data: completed, error: doneErr } = await supabase
    .from("guard_shifts")
    .select("*")
    .in("guard_id", scope.lookup_guard_ids)
    .eq("status", "checked_out")
    .eq("shift_date", today)
    .order("check_out_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (doneErr) throw new Error(doneErr.message);
  return (completed as GuardShift | null) ?? null;
}

export async function checkInShift(input?: {
  location?: z.infer<typeof locationSchema>;
  notes?: string;
  project_id?: string;
}) {
  const data = z
    .object({
      location: locationSchema,
      notes: z.string().max(500).optional(),
      project_id: z.string().uuid().optional(),
    })
    .parse(input ?? {});

  const { supabase, userId } = await requireUser();
  const scope = await resolveGuardScope(supabase, userId);
  const now = new Date();
  const nowIso = now.toISOString();
  const today = localDateIso(now);

  await closeStaleOpenShifts(supabase, scope.lookup_guard_ids, now);

  const onDuty = await findOpenOnDutyShift(supabase, scope.lookup_guard_ids, now);
  if (onDuty) return { id: onDuty.id, reused: true };

  const { data: scheduled } = await supabase
    .from("guard_shifts")
    .select("id, project_id")
    .in("guard_id", scope.lookup_guard_ids)
    .eq("status", "scheduled")
    .eq("shift_date", today)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!scheduled) {
    const { data: completed } = await supabase
      .from("guard_shifts")
      .select("id")
      .in("guard_id", scope.lookup_guard_ids)
      .eq("status", "checked_out")
      .eq("shift_date", today)
      .order("check_out_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (completed) {
      throw new Error("Ca trực hôm nay đã hoàn thành. Bạn không thể check-in lại.");
    }

    throw new Error(
      "Hôm nay bạn không có ca trực được phân công. Vui lòng liên hệ quản lý an ninh.",
    );
  }

  const projectId = data.project_id ?? scheduled.project_id ?? scope.project_id;

  const { error } = await supabase
    .from("guard_shifts")
    .update({
      status: "checked_in",
      check_in_at: nowIso,
      check_in_location: data.location ?? null,
      notes: data.notes ?? null,
      project_id: projectId,
      guard_id: userId,
    })
    .eq("id", scheduled.id);
  if (error) throw new Error(error.message);
  return { id: scheduled.id as string, reused: false };
}

export async function checkOutShift(input?: {
  location?: z.infer<typeof locationSchema>;
  notes?: string;
}) {
  const data = z
    .object({
      location: locationSchema,
      notes: z.string().max(500).optional(),
    })
    .parse(input ?? {});

  const { supabase, userId } = await requireUser();
  const scope = await resolveGuardScope(supabase, userId);
  const now = new Date();

  const onDuty = await findOpenOnDutyShift(supabase, scope.lookup_guard_ids, now);
  if (!onDuty) throw new Error("Bạn chưa có ca trực đang mở để kết thúc");

  const { data: active, error: readErr } = await supabase
    .from("guard_shifts")
    .select("id, notes")
    .eq("id", onDuty.id)
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
}

export async function listMyShifts(range?: {
  from?: string;
  to?: string;
}): Promise<GuardShift[]> {
  const { supabase, userId } = await requireUser();
  const scope = await resolveGuardScope(supabase, userId);
  return listMyShiftsRpc(supabase, userId, scope, range);
}

export async function logPatrolCheckpoint(input: {
  checkpoint_code: string;
  route_code?: string;
  scan_method?: "qr" | "nfc" | "manual";
  location?: z.infer<typeof locationSchema>;
  notes?: string;
  photo_url?: string;
}): Promise<PatrolLog> {
  const data = z
    .object({
      checkpoint_code: z.string().min(1).max(100),
      route_code: z.string().max(100).optional(),
      scan_method: z.enum(["qr", "nfc", "manual"]).default("qr"),
      location: locationSchema,
      notes: z.string().max(500).optional(),
      photo_url: z.string().url().max(500).optional(),
    })
    .parse(input);

  const { supabase, userId } = await requireUser();
  const scope = await resolveGuardScope(supabase, userId);
  const active = await findOpenOnDutyShift(supabase, scope.lookup_guard_ids);

  const { data: inserted, error } = await supabase
    .from("patrol_logs")
    .insert({
      guard_id: userId,
      shift_id: active?.id ?? null,
      project_id: active?.project_id ?? scope.project_id,
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
}

export async function listPatrolLogs(input?: {
  shift_id?: string;
  scope?: "mine" | "shift" | "today";
}): Promise<PatrolLog[]> {
  const data = z
    .object({
      shift_id: z.string().uuid().optional(),
      scope: z.enum(["mine", "shift", "today"]).default("today"),
    })
    .parse(input ?? {});

  const { supabase, userId } = await requireUser();
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
}
