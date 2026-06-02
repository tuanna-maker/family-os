import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HelperRow = {
  id: string;
  family_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  id_number: string | null;
  hometown: string | null;
  avatar: string;
  salary: number;
  start_date: string | null;
  rating: number;
  verified: boolean;
  status: "active" | "paused" | "ended";
  schedule: { day: string; hours: string; off?: boolean }[];
  permissions: { id: string; label: string; desc: string; kind: "allow" | "deny"; enabled: boolean }[];
};
export type TaskRow = { id: string; title: string; time: string | null; icon: string; done: boolean; task_date: string };
export type AttendanceRow = { id: string; att_date: string; status: "present" | "leave" | "absent" };
export type PaymentRow = { id: string; month: string; amount: number; status: "paid" | "pending"; paid_at: string | null };
export type ActivityRow = { id: string; title: string; detail: string | null; created_at: string };

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
  { id: "elder", label: "Xem hồ sơ ông/bà", desc: "Xem lịch uống thuốc, sức khoẻ", kind: "allow" as const, enabled: false },
  { id: "finance", label: "Không xem chi tiêu", desc: "Ẩn dữ liệu tài chính gia đình", kind: "deny" as const, enabled: true },
  { id: "memories", label: "Không xem khoảnh khắc", desc: "Ẩn ảnh & kỷ niệm riêng tư", kind: "deny" as const, enabled: true },
];

export const listHelpers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { familyId: string }) => z.object({ familyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<HelperRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("family_helpers").select("*").eq("family_id", data.familyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      ...r,
      schedule: (r.schedule?.length ? r.schedule : DEFAULT_SCHEDULE),
      permissions: (r.permissions?.length ? r.permissions : DEFAULT_PERMISSIONS),
    })) as HelperRow[];
  });

export const getHelperData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { helperId: string }) => z.object({ helperId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const [tasks, att, pay, act] = await Promise.all([
      supabase.from("family_helper_tasks").select("id,title,time,icon,done,task_date")
        .eq("helper_id", data.helperId).eq("task_date", today).order("created_at"),
      supabase.from("family_helper_attendance").select("id,att_date,status")
        .eq("helper_id", data.helperId).gte("att_date", weekAgo).order("att_date"),
      supabase.from("family_helper_payments").select("id,month,amount,status,paid_at")
        .eq("helper_id", data.helperId).order("created_at", { ascending: false }).limit(6),
      supabase.from("family_helper_activity").select("id,title,detail,created_at")
        .eq("helper_id", data.helperId).order("created_at", { ascending: false }).limit(10),
    ]);
    for (const r of [tasks, att, pay, act]) if (r.error) throw new Error(r.error.message);
    return {
      tasks: (tasks.data ?? []) as TaskRow[],
      attendance: (att.data ?? []) as AttendanceRow[],
      payments: (pay.data ?? []) as PaymentRow[],
      activity: (act.data ?? []) as ActivityRow[],
    };
  });

export const createHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    familyId: z.string().uuid(),
    name: z.string().min(1).max(80),
    role: z.string().max(80).optional(),
    phone: z.string().max(32).optional(),
    id_number: z.string().max(32).optional(),
    hometown: z.string().max(80).optional(),
    avatar: z.string().max(8).optional(),
    salary: z.number().min(0).max(1e10).default(0),
    start_date: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase.from("family_helpers").insert({
      family_id: data.familyId,
      name: data.name,
      role: data.role ?? null,
      phone: data.phone ?? null,
      id_number: data.id_number ?? null,
      hometown: data.hometown ?? null,
      avatar: data.avatar || "🧑‍🍳",
      salary: data.salary,
      start_date: data.start_date || null,
      schedule: DEFAULT_SCHEDULE,
      permissions: DEFAULT_PERMISSIONS,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(80).optional(),
    role: z.string().max(80).nullable().optional(),
    phone: z.string().max(32).nullable().optional(),
    salary: z.number().min(0).max(1e10).optional(),
    verified: z.boolean().optional(),
    status: z.enum(["active","paused","ended"]).optional(),
    permissions: z.array(z.object({
      id: z.string(), label: z.string(), desc: z.string(),
      kind: z.enum(["allow","deny"]), enabled: z.boolean(),
    })).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("family_helpers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_helpers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    helper_id: z.string().uuid(),
    title: z.string().min(1).max(120),
    time: z.string().max(40).optional(),
    icon: z.string().max(8).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_helper_tasks").insert({
      helper_id: data.helper_id, title: data.title,
      time: data.time ?? null, icon: data.icon || "📝",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_helper_tasks").update({ done: data.done }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_helper_tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    helper_id: z.string().uuid(),
    att_date: z.string(),
    status: z.enum(["present","leave","absent"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_helper_attendance").upsert({
      helper_id: data.helper_id, att_date: data.att_date, status: data.status,
    }, { onConflict: "helper_id,att_date" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    helper_id: z.string().uuid(),
    month: z.string().min(1).max(20),
    amount: z.number().min(0).max(1e10),
    status: z.enum(["paid","pending"]).default("pending"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_helper_payments").insert({
      helper_id: data.helper_id, month: data.month, amount: data.amount,
      status: data.status, paid_at: data.status === "paid" ? new Date().toISOString() : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["paid","pending"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_helper_payments").update({
      status: data.status, paid_at: data.status === "paid" ? new Date().toISOString() : null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    helper_id: z.string().uuid(),
    title: z.string().min(1).max(120),
    detail: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_helper_activity").insert({
      helper_id: data.helper_id, title: data.title, detail: data.detail ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
