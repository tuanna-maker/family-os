import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";
import { resolveResidentScope } from "@/lib/resident-scope";

function ticketCode(prefix: string) {
  const now = new Date();
  const ymd =
    String(now.getUTCFullYear()).slice(-2) +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

async function insertServiceRequest(
  request_type: string,
  apartment: string | null,
  payload: Record<string, unknown>,
) {
  const { supabase, userId } = await requireUser();
  const scope = await resolveResidentScope(supabase, userId);
  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from("security_requests")
    .insert({
      requester_id: userId,
      request_type,
      status: "open",
      apartment,
      apartment_id: scope.apartment_id,
      project_id: scope.project_id,
      payload: { ...payload, submitted_at: now } as never,
    } as never)
    .select("id, created_at")
    .single();
  if (error) throw new Error(error.message);
  // Push OS: Database webhook → dispatch-security-request-push (không gọi thêm từ client — tránh trùng).
  return {
    id: row.id as string,
    ticket_code: (payload.ticket_code as string) ?? null,
    created_at: row.created_at as string,
  };
}

// ─── Package hold ───────────────────────────────────────────────
export const HOLD_PLANS = ["standard", "extended", "long_term"] as const;
export const ITEM_TYPES = ["package", "food", "fragile", "document", "other"] as const;
export const HOLD_PLAN_META = {
  standard: { label: "Giữ hộ tiêu chuẩn", sub: "Tối đa 3 ngày", price: "Miễn phí" },
  extended: { label: "Giữ hộ mở rộng", sub: "4 – 7 ngày", price: "20.000đ / ngày" },
  long_term: { label: "Giữ hộ dài hạn", sub: "Trên 7 ngày", price: "Liên hệ BQL" },
} as const;

const packageHoldSchema = z.object({
  address: z.string().min(1).max(200),
  recipient_name: z.string().min(1).max(120),
  phone: z.string().min(6).max(40),
  item_type: z.enum(ITEM_TYPES),
  courier: z.string().max(80).optional().nullable(),
  expected_date: z.string().min(1).max(20),
  expected_time_window: z.string().max(40).optional().nullable(),
  courier_note: z.string().max(200).optional().nullable(),
  hold_plan: z.enum(HOLD_PLANS),
  notify_on_arrival: z.boolean().default(true),
  photo_on_receive: z.boolean().default(true),
  estimated_cost: z.number().min(0).default(0),
});

export async function createPackageHold(data: z.infer<typeof packageHoldSchema>) {
  const parsed = packageHoldSchema.parse(data);
  const code = ticketCode("PKG");
  return insertServiceRequest("package", parsed.address, { ...parsed, ticket_code: code });
}

// ─── Package ship ───────────────────────────────────────────────
export const COURIERS = [
  { id: "ghn", label: "Giao Hàng Nhanh (GHN)", fee: 25_000 },
  { id: "viettel", label: "Viettel Post", fee: 20_000 },
  { id: "jt", label: "J&T Express", fee: 18_000 },
  { id: "vnpost", label: "VNPost (Bưu điện)", fee: 15_000 },
] as const;

const packageShipSchema = z.object({
  sender_name: z.string().min(1).max(120),
  sender_address: z.string().min(1).max(200),
  sender_phone: z.string().min(6).max(40),
  recipient_name: z.string().min(1).max(120),
  recipient_address: z.string().min(1).max(200),
  recipient_phone: z.string().min(6).max(40),
  item_type: z.enum(["package", "document", "fragile", "food", "other"]),
  weight: z.string().max(40).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  courier_id: z.enum(["ghn", "viettel", "jt", "vnpost"]),
  courier_label: z.string().max(80),
  shipping_fee: z.number().min(0),
  estimated_total: z.number().min(0),
  note: z.string().max(200).optional().nullable(),
});

export async function createPackageShip(data: z.infer<typeof packageShipSchema>) {
  const parsed = packageShipSchema.parse(data);
  const code = ticketCode("SHIP");
  return insertServiceRequest("shipping", parsed.sender_address, { ...parsed, ticket_code: code });
}

// ─── Apartment delivery ─────────────────────────────────────────
export const DELIVERY_OPTIONS = [
  { id: "to_apartment", label: "Giao tận căn hộ", fee: 25_000 },
  { id: "to_door", label: "Giao đến cửa căn hộ", fee: 15_000 },
  { id: "at_counter", label: "Để tại quầy bảo vệ", fee: 0 },
] as const;

const deliverySchema = z.object({
  item_type: z.enum(["package", "food", "fragile", "document", "other"]),
  weight_range: z.string().max(40).optional().nullable(),
  recipient_name: z.string().min(1).max(120),
  recipient_phone: z.string().min(6).max(40),
  apartment: z.string().min(1).max(120),
  floor_unit: z.string().max(60).optional().nullable(),
  expected_window: z.string().max(60).optional().nullable(),
  delivery_note: z.string().max(200).optional().nullable(),
  option_id: z.enum(["to_apartment", "to_door", "at_counter"]),
  option_label: z.string().max(80),
  delivery_fee: z.number().min(0),
  estimated_total: z.number().min(0),
});

export async function createApartmentDelivery(data: z.infer<typeof deliverySchema>) {
  const parsed = deliverySchema.parse(data);
  const code = ticketCode("DLV");
  return insertServiceRequest("delivery", parsed.apartment, { ...parsed, ticket_code: code });
}

// ─── Home care ──────────────────────────────────────────────────
export const CARE_DURATIONS = [
  { id: "h2", label: "2 giờ", hours: 2, fee: 120_000 },
  { id: "h4", label: "4 giờ", hours: 4, fee: 220_000 },
  { id: "h8", label: "8 giờ (cả ngày)", hours: 8, fee: 400_000 },
  { id: "overnight", label: "Qua đêm (12h)", hours: 12, fee: 600_000 },
] as const;

const homeCareSchema = z.object({
  target: z.enum(["elderly", "child", "patient", "other"]),
  recipient_name: z.string().min(1).max(120),
  apartment: z.string().min(1).max(120),
  start_date: z.string().min(1).max(20),
  start_time: z.string().min(1).max(10),
  duration_id: z.enum(["h2", "h4", "h8", "overnight"]),
  duration_label: z.string().max(80),
  duration_hours: z.number().min(0),
  tasks: z.array(z.string()).max(20).default([]),
  contact_name: z.string().min(1).max(120),
  contact_phone: z.string().min(6).max(40),
  health_notes: z.string().max(300).optional().nullable(),
  base_fee: z.number().min(0),
  estimated_total: z.number().min(0),
});

export async function createHomeCare(data: z.infer<typeof homeCareSchema>) {
  const parsed = homeCareSchema.parse(data);
  const code = ticketCode("CARE");
  return insertServiceRequest("home_care", parsed.apartment, { ...parsed, ticket_code: code });
}

// ─── Escort ─────────────────────────────────────────────────────
export const ESCORT_BASE_FEE = 30_000;

const escortSchema = z.object({
  direction: z.enum(["up", "down"]),
  direction_label: z.string().max(60),
  recipient_name: z.string().min(1).max(120),
  recipient_target: z.enum(["elderly", "child", "patient", "other"]),
  pickup_location: z.string().min(1).max(160),
  dropoff_location: z.string().min(1).max(160),
  scheduled_date: z.string().min(1).max(20),
  scheduled_time: z.string().min(1).max(10),
  frequency: z.enum(["once", "repeat"]),
  contact_name: z.string().min(1).max(120),
  contact_phone: z.string().min(6).max(40),
  estimated_total: z.number().min(0),
  extra_note: z.string().max(200).optional().nullable(),
});

export async function createEscort(data: z.infer<typeof escortSchema>) {
  const parsed = escortSchema.parse(data);
  const code = ticketCode("ESC");
  return insertServiceRequest("escort", parsed.pickup_location, { ...parsed, ticket_code: code });
}

// ─── Remote freight ─────────────────────────────────────────────
export const FREIGHT_WEIGHTS = [
  { id: "u1", label: "Dưới 1 kg" },
  { id: "1-5", label: "1 – 5 kg" },
  { id: "5-10", label: "5 – 10 kg" },
  { id: "o10", label: "Trên 10 kg" },
] as const;

const freightSchema = z.object({
  sender_name: z.string().min(1).max(120),
  sender_phone: z.string().min(6).max(40),
  sender_address: z.string().min(1).max(200),
  apartment: z.string().min(1).max(120),
  recipient_name: z.string().min(1).max(120),
  recipient_phone: z.string().min(6).max(40),
  item_type: z.enum(["package", "document", "fragile", "food", "other"]),
  weight_id: z.enum(["u1", "1-5", "5-10", "o10"]),
  weight_label: z.string().max(40),
  item_note: z.string().max(200).optional().nullable(),
  estimated_total: z.number().min(0),
});

export async function createRemoteFreight(data: z.infer<typeof freightSchema>) {
  const parsed = freightSchema.parse(data);
  const code = ticketCode("RFR");
  return insertServiceRequest("remote_freight", parsed.apartment, { ...parsed, ticket_code: code });
}

// ─── Guard handle (vắng nhà) ────────────────────────────────────
export const GUARD_TASKS = [
  { id: "door", label: "Mở cửa khi quên khoá", fee: 50_000 },
  { id: "pet", label: "Chăm sóc thú cưng", fee: 80_000 },
  { id: "plant", label: "Tưới cây", fee: 40_000 },
  { id: "inspect", label: "Kiểm tra căn hộ khi đi vắng", fee: 50_000 },
  { id: "fetch", label: "Lấy hộ giấy tờ, đồ vật", fee: 40_000 },
  { id: "other", label: "Yêu cầu khác", fee: 30_000 },
] as const;

const guardHandleSchema = z.object({
  task_id: z.enum(["door", "pet", "plant", "inspect", "fetch", "other"]),
  task_label: z.string().min(1).max(80),
  apartment: z.string().min(1).max(120),
  desired_time: z.string().max(120).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  estimated_total: z.number().min(0),
});

export async function createGuardHandle(data: z.infer<typeof guardHandleSchema>) {
  const parsed = guardHandleSchema.parse(data);
  const code = ticketCode("GHD");
  return insertServiceRequest("guard_handle", parsed.apartment, { ...parsed, ticket_code: code });
}

// ─── Hourly guard ───────────────────────────────────────────────
export const HOURLY_GUARD_RATE = 80_000;

const hourlyGuardSchema = z.object({
  service_date: z.string().min(1).max(20),
  start_time: z.string().min(1).max(10),
  end_time: z.string().min(1).max(10),
  hours: z.number().int().min(1).max(24),
  apartment: z.string().min(1).max(150),
  description: z.string().max(200).optional().nullable(),
  guard_count: z.number().int().min(1).max(10),
  estimated_total: z.number().min(0),
});

export async function createHourlyGuard(data: z.infer<typeof hourlyGuardSchema>) {
  const parsed = hourlyGuardSchema.parse(data);
  const code = ticketCode("HGD");
  return insertServiceRequest("hourly_guard", parsed.apartment, { ...parsed, ticket_code: code });
}

// ─── Custom guard ───────────────────────────────────────────────
export const CUSTOM_GUARD_SERVICES = [
  { id: "patrol", label: "Tuần tra, giám sát" },
  { id: "access", label: "Kiểm soát ra vào" },
  { id: "event", label: "Bảo vệ sự kiện" },
  { id: "asset", label: "Đảm bảo an ninh tài sản" },
  { id: "other", label: "Yêu cầu khác" },
] as const;

const customGuardSchema = z.object({
  service_id: z.enum(["patrol", "access", "event", "asset", "other"]),
  start_at: z.string().min(1).max(40),
  end_at: z.string().max(40).optional().nullable(),
  apartment: z.string().min(1).max(150),
  description: z.string().max(300).optional().nullable(),
  guard_count: z.number().int().min(1).max(20),
  estimated_total: z.number().min(0),
});

export async function createCustomGuard(data: z.infer<typeof customGuardSchema>) {
  const parsed = customGuardSchema.parse(data);
  const code = ticketCode("CGD");
  return insertServiceRequest("custom_guard", parsed.apartment, { ...parsed, ticket_code: code });
}

// ─── Guard directory ────────────────────────────────────────────
export type ProjectGuard = {
  guard_id: string;
  full_name: string | null;
  avatar_url?: string | null;
  phone: string | null;
  role: string;
  on_shift_today: boolean;
  next_shift_at?: string | null;
};

export type ProjectGuardShift = {
  shift_id: string;
  guard_id: string;
  guard_name: string | null;
  guard_avatar: string | null;
  shift_date: string;
  shift_type: string;
  start_at: string;
  end_at: string;
  status: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function localIsoFromTimestamp(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function normalizeGuardShift(row: ProjectGuardShift): ProjectGuardShift {
  let shiftDate = String(row.shift_date ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate) && row.start_at) {
    shiftDate = localIsoFromTimestamp(row.start_at);
  }
  return { ...row, shift_date: shiftDate };
}

const UNLINKED_MSG =
  "Tài khoản của bạn chưa được liên kết với căn hộ. Vui lòng liên hệ Ban Quản Lý để được cập nhật.";

async function listProjectGuardsFallback(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], projectId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: roles, error: rolesErr }, { data: shifts, error: shiftsErr }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id, role, profiles(full_name, avatar_url, phone)")
      .eq("project_id", projectId)
      .in("role", ["security_admin", "security_staff"]),
    supabase
      .from("guard_shifts")
      .select("guard_id, start_at, status")
      .eq("project_id", projectId)
      .gte("shift_date", today)
      .in("status", ["scheduled", "checked_in"]),
  ]);
  if (rolesErr) throw new Error(rolesErr.message);
  if (shiftsErr) throw new Error(shiftsErr.message);

  const onShiftToday = new Set(
    (shifts ?? [])
      .filter((s) => s.status === "checked_in" || String(s.start_at).slice(0, 10) === today)
      .map((s) => s.guard_id as string),
  );
  const nextByGuard = new Map<string, string>();
  for (const s of shifts ?? []) {
    const gid = s.guard_id as string;
    const at = s.start_at as string;
    if (!onShiftToday.has(gid) && at > new Date().toISOString()) {
      const prev = nextByGuard.get(gid);
      if (!prev || at < prev) nextByGuard.set(gid, at);
    }
  }

  const guards: ProjectGuard[] = (roles ?? []).map((r) => {
    const profile = r.profiles as { full_name: string | null; avatar_url: string | null; phone: string | null } | null;
    const gid = r.user_id as string;
    return {
      guard_id: gid,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      phone: profile?.phone ?? null,
      role: r.role as string,
      on_shift_today: onShiftToday.has(gid),
      next_shift_at: nextByGuard.get(gid) ?? null,
    };
  });

  return guards;
}

export async function listProjectGuards() {
  const { supabase, userId } = await requireUser();
  const scope = await resolveResidentScope(supabase, userId);
  const { data, error } = await supabase.rpc("list_project_guards", {
    _project_id: scope.project_id,
  });
  if (!error) {
    return { project_id: scope.project_id, guards: (data ?? []) as ProjectGuard[] };
  }
  const msg = error.message ?? "";
  if (msg.includes("permission denied") || msg.includes("does not exist")) {
    return { project_id: scope.project_id, guards: await listProjectGuardsFallback(supabase, scope.project_id) };
  }
  throw new Error(msg);
}

async function listProjectGuardLookupIds(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  projectId: string,
  tenantId?: string | null,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, project_id, tenant_id")
    .in("role", ["security_admin", "security_staff"]);
  if (error) throw new Error(error.message);

  const ids = new Set<string>();
  for (const r of data ?? []) {
    const uid = r.user_id as string;
    if (!uid) continue;
    const roleProject = r.project_id as string | null;
    const roleTenant = r.tenant_id as string | null;
    if (
      roleProject === projectId ||
      (roleProject == null && tenantId && roleTenant === tenantId) ||
      (roleProject == null && roleTenant == null)
    ) {
      ids.add(uid);
      if (roleTenant) ids.add(roleTenant);
    }
  }
  return Array.from(ids);
}

async function listProjectGuardScheduleFallback(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  projectId: string,
  range: { from: string; to: string },
  tenantId?: string | null,
) {
  const guardLookupIds = await listProjectGuardLookupIds(supabase, projectId, tenantId);

  let rows: Record<string, unknown>[] = [];

  const byProject = await supabase
    .from("guard_shifts")
    .select("id, guard_id, shift_date, shift_type, start_at, end_at, status")
    .eq("project_id", projectId)
    .gte("shift_date", range.from)
    .lte("shift_date", range.to)
    .order("shift_date")
    .order("start_at");
  if (byProject.error) throw new Error(byProject.error.message);
  rows = [...(byProject.data ?? [])];

  if (guardLookupIds.length > 0) {
    const byGuards = await supabase
      .from("guard_shifts")
      .select("id, guard_id, shift_date, shift_type, start_at, end_at, status")
      .in("guard_id", guardLookupIds)
      .gte("shift_date", range.from)
      .lte("shift_date", range.to)
      .order("shift_date")
      .order("start_at");
    if (byGuards.error) throw new Error(byGuards.error.message);
    rows = [...rows, ...(byGuards.data ?? [])];
  }

  const seen = new Set<string>();
  rows = rows.filter((r) => {
    const id = r.id as string;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const guardIds = Array.from(new Set((rows ?? []).map((r) => r.guard_id as string).filter(Boolean)));
  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  if (guardIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", guardIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id as string, {
        full_name: (p.full_name as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      });
    }
  }

  return (rows ?? []).map((r) => {
    const p = profileMap.get(r.guard_id as string);
    return normalizeGuardShift({
      shift_id: r.id as string,
      guard_id: r.guard_id as string,
      guard_name: p?.full_name ?? null,
      guard_avatar: p?.avatar_url ?? null,
      shift_date: r.shift_date as string,
      shift_type: r.shift_type as string,
      start_at: r.start_at as string,
      end_at: r.end_at as string,
      status: r.status as string,
    });
  });
}

export async function listProjectGuardSchedule(range: { from: string; to: string }) {
  const { supabase, userId } = await requireUser();
  const scope = await resolveResidentScope(supabase, userId);
  const { data, error } = await supabase.rpc("list_project_guard_shifts", {
    _project_id: scope.project_id,
    _from: range.from,
    _to: range.to,
  });

  if (!error) {
    const shifts = ((data ?? []) as ProjectGuardShift[]).map(normalizeGuardShift);
    if (shifts.length > 0) {
      return { project_id: scope.project_id, shifts };
    }
    const fallback = await listProjectGuardScheduleFallback(
      supabase,
      scope.project_id,
      range,
      scope.tenant_id,
    );
    return { project_id: scope.project_id, shifts: fallback.length > 0 ? fallback : shifts };
  }

  const msg = error.message ?? "";
  if (msg.includes("permission denied") || msg.includes("does not exist")) {
    return {
      project_id: scope.project_id,
      shifts: await listProjectGuardScheduleFallback(
        supabase,
        scope.project_id,
        range,
        scope.tenant_id,
      ),
    };
  }
  if (msg.includes("chưa được liên kết")) throw new Error(UNLINKED_MSG);
  throw new Error(msg);
}
