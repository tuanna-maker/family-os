import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type HelperRow = {
  id: string;
  family_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  avatar: string;
  salary: number;
  status: "active" | "paused" | "ended";
  verified: boolean;
  schedule: { day: string; hours: string; off?: boolean }[];
  permissions: { id: string; label: string; desc: string; kind: "allow" | "deny"; enabled: boolean }[];
};

const DEFAULT_SCHEDULE = [
  { day: "Thứ 2", hours: "07:00 - 17:00" },
  { day: "Thứ 3", hours: "07:00 - 17:00" },
  { day: "Thứ 4", hours: "07:00 - 17:00" },
  { day: "Thứ 5", hours: "07:00 - 17:00" },
  { day: "Thứ 6", hours: "07:00 - 17:00" },
  { day: "Thứ 7", hours: "08:00 - 14:00" },
  { day: "Chủ nhật", hours: "Nghỉ", off: true },
];

const DEFAULT_PERMISSIONS = [
  { id: "door", label: "Mở cửa căn hộ", desc: "Dùng app/QR mở cửa khi đến giờ làm", kind: "allow" as const, enabled: true },
  { id: "delivery", label: "Nhận hàng hộ", desc: "Cho phép ký nhận đơn giao", kind: "allow" as const, enabled: true },
  { id: "finance", label: "Không xem chi tiêu", desc: "Ẩn dữ liệu tài chính", kind: "deny" as const, enabled: true },
];

function mapHelper(r: Record<string, unknown>): HelperRow {
  return {
    id: r.id as string,
    family_id: r.family_id as string,
    name: r.name as string,
    role: (r.role as string) ?? null,
    phone: (r.phone as string) ?? null,
    avatar: (r.avatar as string) || "🧑‍🍳",
    salary: Number(r.salary ?? 0),
    status: r.status as HelperRow["status"],
    verified: Boolean(r.verified),
    schedule: (r.schedule as HelperRow["schedule"])?.length ? (r.schedule as HelperRow["schedule"]) : DEFAULT_SCHEDULE,
    permissions: (r.permissions as HelperRow["permissions"])?.length
      ? (r.permissions as HelperRow["permissions"])
      : DEFAULT_PERMISSIONS,
  };
}

export async function listHelpers(data: { family_id: string }) {
  const { supabase } = await requireUser();
  const { family_id } = z.object({ family_id: z.string().uuid() }).parse(data);
  const { data: rows, error } = await (supabase as any)
    .from("family_helpers")
    .select("*")
    .eq("family_id", family_id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (rows ?? []).map((r: any) => mapHelper(r as Record<string, unknown>));
}

export async function getHelperBundle(data: { helper_id: string }) {
  const { supabase } = await requireUser();
  const { helper_id } = z.object({ helper_id: z.string().uuid() }).parse(data);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const [tasks, att, pay, act] = await Promise.all([
    (supabase as any)
      .from("family_helper_tasks")
      .select("id,title,time,icon,done,task_date")
      .eq("helper_id", helper_id)
      .eq("task_date", today)
      .order("created_at"),
    (supabase as any)
      .from("family_helper_attendance")
      .select("id,att_date,status")
      .eq("helper_id", helper_id)
      .gte("att_date", weekAgo)
      .order("att_date"),
    (supabase as any)
      .from("family_helper_payments")
      .select("id,month,amount,status,paid_at")
      .eq("helper_id", helper_id)
      .order("created_at", { ascending: false })
      .limit(6),
    (supabase as any)
      .from("family_helper_activity")
      .select("id,title,detail,created_at")
      .eq("helper_id", helper_id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);
  for (const r of [tasks, att, pay, act]) if (r.error) throw new Error(r.error.message);
  return {
    tasks: tasks.data ?? [],
    attendance: att.data ?? [],
    payments: pay.data ?? [],
    activity: act.data ?? [],
  };
}

export async function upsertHelper(data: {
  id?: string;
  family_id: string;
  name: string;
  role?: string;
  phone?: string;
  salary?: number;
  avatar?: string;
}) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      family_id: z.string().uuid(),
      name: z.string().min(1).max(80),
      role: z.string().max(80).optional(),
      phone: z.string().max(32).optional(),
      salary: z.number().min(0).optional(),
      avatar: z.string().max(8).optional(),
    })
    .parse(data);
  if (parsed.id) {
    const { error } = await (supabase as any)
      .from("family_helpers")
      .update({
        name: parsed.name,
        role: parsed.role ?? null,
        phone: parsed.phone ?? null,
        salary: parsed.salary ?? 0,
        avatar: parsed.avatar || "🧑‍🍳",
      })
      .eq("id", parsed.id);
    if (error) throw new Error(error.message);
    return { id: parsed.id };
  }
  const { data: row, error } = await (supabase as any)
    .from("family_helpers")
    .insert({
      family_id: parsed.family_id,
      name: parsed.name,
      role: parsed.role ?? null,
      phone: parsed.phone ?? null,
      avatar: parsed.avatar || "🧑‍🍳",
      salary: parsed.salary ?? 0,
      schedule: DEFAULT_SCHEDULE,
      permissions: DEFAULT_PERMISSIONS,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: row.id as string };
}

export async function toggleHelperTask(data: { id: string; done: boolean }) {
  const { supabase } = await requireUser();
  const parsed = z.object({ id: z.string().uuid(), done: z.boolean() }).parse(data);
  const { error } = await (supabase as any).from("family_helper_tasks").update({ done: parsed.done }).eq("id", parsed.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function upsertHelperTask(data: {
  id?: string;
  helper_id: string;
  title: string;
  time?: string;
  icon?: string;
  task_date?: string;
}) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      helper_id: z.string().uuid(),
      title: z.string().min(1).max(120),
      time: z.string().max(16).optional(),
      icon: z.string().max(8).optional(),
      task_date: z.string().optional(),
    })
    .parse(data);
  const day = parsed.task_date ?? new Date().toISOString().slice(0, 10);
  const payload = {
    helper_id: parsed.helper_id,
    title: parsed.title,
    time: parsed.time ?? null,
    icon: parsed.icon ?? "📝",
    task_date: day,
  };
  if (parsed.id) {
    const { error } = await (supabase as any).from("family_helper_tasks").update(payload).eq("id", parsed.id);
    if (error) throw new Error(error.message);
    return { id: parsed.id };
  }
  const { data: row, error } = await (supabase as any).from("family_helper_tasks").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: row.id as string };
}

export async function setHelperAttendance(data: {
  helper_id: string;
  att_date: string;
  status: "present" | "leave" | "absent";
}) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({
      helper_id: z.string().uuid(),
      att_date: z.string(),
      status: z.enum(["present", "leave", "absent"]),
    })
    .parse(data);
  const { error } = await (supabase as any).from("family_helper_attendance").upsert(
    { helper_id: parsed.helper_id, att_date: parsed.att_date, status: parsed.status },
    { onConflict: "helper_id,att_date" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Tạo mã QR ca làm (lưu activity + trả token cho in/chia sẻ). */
export async function issueHelperShiftToken(data: { helper_id: string; kind: "check_in" | "check_out" }) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      helper_id: z.string().uuid(),
      kind: z.enum(["check_in", "check_out"]),
    })
    .parse(data);
  const day = new Date().toISOString().slice(0, 10);
  const token = `HLP-${parsed.helper_id.slice(0, 8)}-${day}-${parsed.kind === "check_in" ? "IN" : "OUT"}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const title = parsed.kind === "check_in" ? "Phát mã vào ca" : "Phát mã kết ca";
  const { error } = await (supabase as any).from("family_helper_activity").insert({
    helper_id: parsed.helper_id,
    title,
    detail: JSON.stringify({ token, kind: parsed.kind, issued_by: userId, valid_date: day }),
  });
  if (error) throw new Error(error.message);
  return { token, kind: parsed.kind };
}

/** Quét / nhập mã QR ca — ghi attendance + activity. */
export async function redeemHelperShiftToken(data: { token: string }) {
  const { supabase } = await requireUser();
  const { token } = z.object({ token: z.string().min(8).max(120) }).parse(data);
  const parts = token.split("-");
  if (parts[0] !== "HLP" || parts.length < 5) throw new Error("Mã QR không hợp lệ");
  const helperPrefix = parts[1];
  const day = parts[2];
  const kind = parts[3] === "IN" ? "check_in" : parts[3] === "OUT" ? "check_out" : null;
  if (!kind) throw new Error("Mã QR không hợp lệ");
  const { data: helpers, error: hErr } = await (supabase as any).from("family_helpers").select("id,family_id").limit(200);
  if (hErr) throw new Error(hErr.message);
  const helper = (helpers ?? []).find((h: any) => (h.id as string).startsWith(helperPrefix));
  if (!helper) throw new Error("Không tìm thấy hồ sơ giúp việc");
  const today = new Date().toISOString().slice(0, 10);
  if (day !== today) throw new Error("Mã QR đã hết hạn (khác ngày)");
  await setHelperAttendance({
    helper_id: helper.id as string,
    att_date: today,
    status: kind === "check_in" ? "present" : "present",
  });
  await (supabase as any).from("family_helper_activity").insert({
    helper_id: helper.id,
    title: kind === "check_in" ? "Check-in QR" : "Check-out QR",
    detail: `Token ${token}`,
  });
  return { ok: true, helper_id: helper.id as string, kind };
}
