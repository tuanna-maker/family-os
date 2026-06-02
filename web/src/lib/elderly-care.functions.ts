// Server functions cho module Chăm sóc ông bà
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ElderlyProfileRow = {
  id: string;
  family_id: string;
  name: string;
  avatar: string | null;
  age: number | null;
  relation: string | null;
  conditions: string[];
  doctor: string | null;
  phone: string | null;
  address: string | null;
  safe_status: "ok" | "warn" | "alert";
  safe_note: string | null;
  safe_last_at: string | null;
};

export type MedicineReminderRow = {
  id: string;
  medicine: string;
  dosage: string | null;
  time_of_day: string | null;
  member_name: string;
  notes: string | null;
  active: boolean;
  taken_today: boolean;
  taken_at: string | null;
};

export type CareNoteRow = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export type VitalRow = {
  id: string;
  kind: string;
  title: string;
  value: string | null;
  recorded_at: string;
  notes: string | null;
};

export type ActivityRow = {
  id: string;
  kind: "med" | "check" | "note" | "vital";
  title: string;
  detail: string;
  at: string;
  meta?: { status?: "ok" | "warn" | "alert"; author?: string | null } | null;
};

export type SafeCheckRow = {
  id: string;
  status: "ok" | "warn" | "alert";
  note: string | null;
  checked_at: string;
  checked_by: string;
  author_name: string | null;
};

const FAMILY_ARG = z.object({ familyId: z.string().uuid() });

// ============ ELDERLY PROFILES ============
export const listElderlyProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FAMILY_ARG.parse(d))
  .handler(async ({ data, context }): Promise<ElderlyProfileRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("elderly_profiles")
      .select(
        "id, family_id, name, avatar, age, relation, conditions, doctor, phone, address, safe_status, safe_note, safe_last_at",
      )
      .eq("family_id", data.familyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ElderlyProfileRow[];
  });

export const createElderlyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        family_id: z.string().uuid(),
        name: z.string().min(1).max(80),
        avatar: z.string().max(8).optional(),
        age: z.number().int().min(0).max(130).optional(),
        relation: z.string().max(40).optional(),
        conditions: z.array(z.string().max(80)).max(20).optional(),
        doctor: z.string().max(200).optional(),
        phone: z.string().max(20).optional(),
        address: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("elderly_profiles")
      .insert({
        family_id: data.family_id,
        created_by: userId,
        name: data.name,
        avatar: data.avatar ?? "👵",
        age: data.age ?? null,
        relation: data.relation ?? null,
        conditions: data.conditions ?? [],
        doctor: data.doctor ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteElderlyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("elderly_profiles")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SAFE CHECK ============
export const confirmSafeCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        elderly_id: z.string().uuid(),
        family_id: z.string().uuid(),
        status: z.enum(["ok", "warn", "alert"]).default("ok"),
        note: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const { error: e1 } = await supabase.from("safe_checks").insert({
      elderly_id: data.elderly_id,
      family_id: data.family_id,
      status: data.status,
      note: data.note ?? null,
      checked_by: userId,
      checked_at: now,
    });
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase
      .from("elderly_profiles")
      .update({
        safe_status: data.status,
        safe_note: data.note ?? "Đã xác nhận khoẻ",
        safe_last_at: now,
      })
      .eq("id", data.elderly_id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const listSafeChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        elderlyId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<SafeCheckRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("safe_checks")
      .select("id, status, note, checked_at, checked_by")
      .eq("elderly_id", data.elderlyId)
      .order("checked_at", { ascending: false })
      .limit(data.limit ?? 15);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.checked_by).filter(Boolean)));
    let nameMap = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      nameMap = new Map((profs ?? []).map((p) => [p.id as string, (p.full_name as string) ?? ""]));
    }
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as SafeCheckRow["status"],
      note: (r.note as string | null) ?? null,
      checked_at: r.checked_at as string,
      checked_by: r.checked_by as string,
      author_name: nameMap.get(r.checked_by as string) || null,
    }));
  });

// ============ MEDICINE REMINDERS ============
export const listMedicineReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ familyId: z.string().uuid(), memberName: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<MedicineReminderRow[]> => {
    const { supabase } = context;
    let q = supabase
      .from("medicine_reminders")
      .select("id, medicine, dosage, time_of_day, member_name, notes, active")
      .eq("family_id", data.familyId)
      .eq("active", true)
      .order("time_of_day", { ascending: true });
    if (data.memberName) q = q.eq("member_name", data.memberName);
    const { data: rems, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rems ?? []).map((r) => r.id);
    let logsByReminder = new Map<string, string>();
    if (ids.length > 0) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data: logs } = await supabase
        .from("medicine_logs")
        .select("reminder_id, taken_at")
        .in("reminder_id", ids)
        .gte("taken_at", since.toISOString())
        .order("taken_at", { ascending: false });
      for (const l of logs ?? []) {
        if (!logsByReminder.has(l.reminder_id)) {
          logsByReminder.set(l.reminder_id, l.taken_at);
        }
      }
    }

    return (rems ?? []).map((r) => ({
      ...r,
      taken_today: logsByReminder.has(r.id),
      taken_at: logsByReminder.get(r.id) ?? null,
    })) as MedicineReminderRow[];
  });

export type MedicineWeekEntry = {
  reminder_id: string;
  medicine: string;
  dosage: string | null;
  time_of_day: string | null;
  taken: boolean;
  taken_at: string | null;
};
export type MedicineWeekDay = {
  date: string; // YYYY-MM-DD
  entries: MedicineWeekEntry[];
};

// Lịch nhắc thuốc theo tuần (7 ngày), trả về trạng thái uống theo từng ngày.
export const listMedicineWeek = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        memberName: z.string().min(1),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(), // ngày đầu (YYYY-MM-DD), mặc định = hôm nay - 3
        days: z.union([z.literal(7), z.literal(14)]).default(7),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<MedicineWeekDay[]> => {
    const { supabase } = context;
    const start = data.startDate
      ? new Date(data.startDate + "T00:00:00")
      : (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - 3);
          return d;
        })();
    const end = new Date(start);
    end.setDate(end.getDate() + data.days);

    const { data: rems, error } = await supabase
      .from("medicine_reminders")
      .select("id, medicine, dosage, time_of_day, active")
      .eq("family_id", data.familyId)
      .eq("member_name", data.memberName)
      .eq("active", true)
      .order("time_of_day", { ascending: true });
    if (error) throw new Error(error.message);
    const reminders = rems ?? [];
    const remIds = reminders.map((r) => r.id as string);

    let logs: { reminder_id: string; taken_at: string }[] = [];
    if (remIds.length > 0) {
      const { data: lg, error: e2 } = await supabase
        .from("medicine_logs")
        .select("reminder_id, taken_at")
        .in("reminder_id", remIds)
        .gte("taken_at", start.toISOString())
        .lt("taken_at", end.toISOString())
        .order("taken_at", { ascending: true });
      if (e2) throw new Error(e2.message);
      logs = (lg ?? []) as any;
    }

    // Group logs by day+reminder (earliest taken_at per day)
    const key = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`;
    const takenMap = new Map<string, string>(); // `${date}|${rid}` -> taken_at
    for (const l of logs) {
      const dk = key(new Date(l.taken_at));
      const k = `${dk}|${l.reminder_id}`;
      if (!takenMap.has(k)) takenMap.set(k, l.taken_at);
    }

    const out: MedicineWeekDay[] = [];
    for (let i = 0; i < data.days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dk = key(d);
      out.push({
        date: dk,
        entries: reminders.map((r) => {
          const k = `${dk}|${r.id}`;
          return {
            reminder_id: r.id as string,
            medicine: r.medicine as string,
            dosage: (r.dosage as string | null) ?? null,
            time_of_day: (r.time_of_day as string | null) ?? null,
            taken: takenMap.has(k),
            taken_at: takenMap.get(k) ?? null,
          };
        }),
      });
    }
    return out;
  });

export const createMedicineReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        family_id: z.string().uuid(),
        member_name: z.string().min(1).max(80),
        medicine: z.string().min(1).max(120),
        dosage: z.string().max(120).optional(),
        time_of_day: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        notes: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("medicine_reminders")
      .insert({
        family_id: data.family_id,
        created_by: userId,
        member_name: data.member_name,
        medicine: data.medicine,
        dosage: data.dosage ?? null,
        time_of_day: data.time_of_day ?? null,
        notes: data.notes ?? null,
        active: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const markMedicineTaken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reminder_id: z.string().uuid(),
        family_id: z.string().uuid(),
        taken_at: z.string().datetime().optional(),
        note: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("medicine_logs").insert({
      reminder_id: data.reminder_id,
      family_id: data.family_id,
      taken_by: userId,
      taken_at: data.taken_at ?? new Date().toISOString(),
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const undoMedicineTaken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reminder_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { error } = await context.supabase
      .from("medicine_logs")
      .delete()
      .eq("reminder_id", data.reminder_id)
      .gte("taken_at", since.toISOString());
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ CARE NOTES ============
export const listCareNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ elderlyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CareNoteRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("care_notes")
      .select("id, author_name, content, created_at")
      .eq("elderly_id", data.elderlyId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []) as CareNoteRow[];
  });

export const addCareNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        elderly_id: z.string().uuid(),
        family_id: z.string().uuid(),
        content: z.string().min(1).max(2000),
        author_name: z.string().min(1).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("care_notes")
      .insert({
        elderly_id: data.elderly_id,
        family_id: data.family_id,
        content: data.content,
        author_name: data.author_name,
        created_by: userId,
      })
      .select("id, author_name, content, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as CareNoteRow;
  });

// ============ VITAL LOGS (dùng health_records) ============
export const listVitals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ familyId: z.string().uuid(), memberName: z.string() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<VitalRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("health_records")
      .select("id, kind, title, value, recorded_at, notes")
      .eq("family_id", data.familyId)
      .eq("member_name", data.memberName)
      .order("recorded_at", { ascending: false })
      .limit(8);
    if (error) throw new Error(error.message);
    return (rows ?? []) as VitalRow[];
  });

export const addVital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        family_id: z.string().uuid(),
        member_name: z.string().min(1),
        kind: z.string().min(1).max(40),
        title: z.string().min(1).max(80),
        value: z.string().max(80).optional(),
        notes: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("health_records").insert({
      family_id: data.family_id,
      member_name: data.member_name,
      kind: data.kind,
      title: data.title,
      value: data.value ?? null,
      notes: data.notes ?? null,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ACTIVITY LOG (gộp từ các bảng) ============
export const listElderlyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        elderlyId: z.string().uuid(),
        familyId: z.string().uuid(),
        memberName: z.string().min(1).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<ActivityRow[]> => {
    const { supabase } = context;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceIso = since.toISOString();

    // Pre-load reminders so we can label medicine logs
    let remMap = new Map<string, { medicine: string; dosage: string | null }>();
    let remIds: string[] = [];
    if (data.memberName) {
      const remRes = await supabase
        .from("medicine_reminders")
        .select("id, medicine, dosage")
        .eq("family_id", data.familyId)
        .eq("member_name", data.memberName);
      for (const r of remRes.data ?? []) {
        remMap.set(r.id as string, { medicine: r.medicine as string, dosage: (r.dosage as string | null) ?? null });
      }
      remIds = Array.from(remMap.keys());
    }

    const [checks, notes, logs] = await Promise.all([
      supabase
        .from("safe_checks")
        .select("id, status, note, checked_at")
        .eq("elderly_id", data.elderlyId)
        .gte("checked_at", sinceIso)
        .order("checked_at", { ascending: false })
        .limit(20),
      supabase
        .from("care_notes")
        .select("id, author_name, content, created_at")
        .eq("elderly_id", data.elderlyId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(20),
      remIds.length > 0
        ? supabase
            .from("medicine_logs")
            .select("id, reminder_id, note, taken_at")
            .eq("family_id", data.familyId)
            .in("reminder_id", remIds)
            .gte("taken_at", sinceIso)
            .order("taken_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as Array<{ id: string; reminder_id: string; note: string | null; taken_at: string }> }),
    ]);

    const out: ActivityRow[] = [];
    for (const c of checks.data ?? []) {
      out.push({
        id: `chk-${c.id}`,
        kind: "check",
        title: "Safe Check",
        detail: c.note ?? `Trạng thái: ${c.status}`,
        at: c.checked_at,
      });
    }
    for (const n of notes.data ?? []) {
      out.push({
        id: `note-${n.id}`,
        kind: "note",
        title: `${n.author_name} đã ghi chú`,
        detail: n.content,
        at: n.created_at,
      });
    }
    for (const l of (logs.data ?? []) as Array<{ id: string; reminder_id: string; note: string | null; taken_at: string }>) {
      const rem = remMap.get(l.reminder_id);
      out.push({
        id: `med-${l.id}`,
        kind: "med",
        title: rem ? `Đã uống ${rem.medicine}` : "Đã uống thuốc",
        detail: l.note ?? (rem?.dosage ? `Liều: ${rem.dosage}` : ""),
        at: l.taken_at,
      });
    }
    out.sort((a, b) => (a.at < b.at ? 1 : -1));
    return out.slice(0, 30);
  });

// ============ TIMELINE (7/30 ngày) gồm safe checks + ghi chú + thuốc đã uống ============
export const listCareTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        elderlyId: z.string().uuid(),
        familyId: z.string().uuid(),
        memberName: z.string().min(1),
        days: z.union([z.literal(7), z.literal(30)]).default(7),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<ActivityRow[]> => {
    const { supabase } = context;
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const sinceIso = since.toISOString();

    const remRes = await supabase
      .from("medicine_reminders")
      .select("id, medicine, dosage, time_of_day")
      .eq("family_id", data.familyId)
      .eq("member_name", data.memberName);
    const reminders = remRes.data ?? [];
    const remMap = new Map(reminders.map((r) => [r.id as string, r]));
    const remIds = reminders.map((r) => r.id as string);

    const [checks, notes, logs] = await Promise.all([
      supabase
        .from("safe_checks")
        .select("id, status, note, checked_at, checked_by")
        .eq("elderly_id", data.elderlyId)
        .gte("checked_at", sinceIso)
        .order("checked_at", { ascending: false })
        .limit(200),
      supabase
        .from("care_notes")
        .select("id, author_name, content, created_at")
        .eq("elderly_id", data.elderlyId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(200),
      remIds.length
        ? supabase
            .from("medicine_logs")
            .select("id, reminder_id, taken_at, note, taken_by")
            .in("reminder_id", remIds)
            .gte("taken_at", sinceIso)
            .order("taken_at", { ascending: false })
            .limit(400)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    // resolve author names for checks + logs
    const userIds = Array.from(
      new Set([
        ...(checks.data ?? []).map((c) => c.checked_by).filter(Boolean),
        ...((logs.data ?? []) as any[]).map((l) => l.taken_by).filter(Boolean),
      ]),
    );
    let nameMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      nameMap = new Map((profs ?? []).map((p) => [p.id as string, (p.full_name as string) ?? ""]));
    }

    const out: ActivityRow[] = [];
    for (const c of checks.data ?? []) {
      out.push({
        id: `chk-${c.id}`,
        kind: "check",
        title:
          c.status === "ok"
            ? "Safe Check: Khoẻ"
            : c.status === "warn"
              ? "Safe Check: Cần lưu ý"
              : "Safe Check: Khẩn cấp",
        detail: (c.note as string | null) ?? "Đã xác nhận trạng thái",
        at: c.checked_at as string,
        meta: { status: c.status as any, author: nameMap.get(c.checked_by as string) || null },
      });
    }
    for (const n of notes.data ?? []) {
      out.push({
        id: `note-${n.id}`,
        kind: "note",
        title: `Ghi chú · ${n.author_name}`,
        detail: n.content as string,
        at: n.created_at as string,
        meta: { author: n.author_name as string },
      });
    }
    for (const l of (logs.data ?? []) as any[]) {
      const r = remMap.get(l.reminder_id);
      const medName = r ? (r as any).medicine : "Thuốc";
      const dosage = r ? (r as any).dosage : null;
      const detailParts = [dosage, l.note].filter(Boolean);
      out.push({
        id: `med-${l.id}`,
        kind: "med",
        title: `Đã uống: ${medName}`,
        detail: detailParts.join(" · ") || "Đã xác nhận uống thuốc",
        at: l.taken_at as string,
        meta: { author: nameMap.get(l.taken_by as string) || null },
      });
    }

    out.sort((a, b) => (a.at < b.at ? 1 : -1));
    return out;
  });
