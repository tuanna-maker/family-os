import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Fam = z.object({ family_id: z.string().uuid() });

// ============ TYPES ============
export type HealthProfileRow = {
  id: string;
  name: string;
  dob: string | null;
  blood_type: string | null;
  allergies: string | null;
  conditions: string | null;
  notes: string | null;
};
export type MedicineRow = {
  id: string;
  member_name: string;
  medicine: string;
  dosage: string | null;
  time_of_day: string | null;
  days_of_week: string | null;
  active: boolean;
  notes: string | null;
};
export type AppointmentRow = {
  id: string;
  member_name: string;
  doctor: string | null;
  location: string | null;
  scheduled_at: string;
  status: string;
  notes: string | null;
  remind_hours_before: number | null;
  reminded_at: string | null;
};
export type HealthRecordRow = {
  id: string;
  member_name: string;
  kind: string;
  title: string;
  value: string | null;
  recorded_at: string;
  notes: string | null;
};

// ============ LIST ALL ============
export const listHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Fam.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [profiles, meds, appts, recs, logs] = await Promise.all([
      supabase.rpc("get_health_profiles", { _family_id: data.family_id }),
      supabase.from("medicine_reminders").select("*").eq("family_id", data.family_id).order("created_at", { ascending: false }),
      supabase.from("medical_appointments").select("*").eq("family_id", data.family_id).order("scheduled_at"),
      supabase.from("health_records").select("*").eq("family_id", data.family_id).order("recorded_at", { ascending: false }).limit(50),
      supabase.from("medicine_logs").select("id,reminder_id,taken_at").eq("family_id", data.family_id).gte("taken_at", todayStart.toISOString()),
    ]);
    if (profiles.error) throw new Error(profiles.error.message);
    return {
      profiles: (profiles.data ?? []) as HealthProfileRow[],
      meds: (meds.data ?? []) as MedicineRow[],
      appts: (appts.data ?? []) as AppointmentRow[],
      records: (recs.data ?? []) as HealthRecordRow[],
      todayLogs: (logs.data ?? []) as { id: string; reminder_id: string; taken_at: string }[],
    };
  });

// ============ MEDICINE LOG ============
export const markMedicineTaken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      family_id: z.string().uuid(),
      reminder_id: z.string().uuid(),
      note: z.string().max(200).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("medicine_logs").insert({
      family_id: data.family_id,
      reminder_id: data.reminder_id,
      taken_by: userId,
      note: data.note || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const undoMedicineTaken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ log_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("medicine_logs").delete().eq("id", data.log_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PROFILES ============
export const upsertHealthProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      name: z.string().min(1).max(80),
      dob: z.string().nullable().optional(),
      blood_type: z.string().max(8).nullable().optional(),
      allergies: z.string().max(500).nullable().optional(),
      conditions: z.string().max(500).nullable().optional(),
      notes: z.string().max(500).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("upsert_health_profile_enc", {
      _id: data.id ?? null,
      _family_id: data.family_id,
      _name: data.name,
      _dob: data.dob || null,
      _blood_type: data.blood_type ?? null,
      _allergies: data.allergies ?? null,
      _conditions: data.conditions ?? null,
      _notes: data.notes ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ MEDICINE ============
export const upsertMedicine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      member_name: z.string().min(1).max(80),
      medicine: z.string().min(1).max(120),
      dosage: z.string().max(80).nullable().optional(),
      time_of_day: z.string().max(80).nullable().optional(),
      days_of_week: z.string().max(40).nullable().optional(),
      active: z.boolean().default(true),
      notes: z.string().max(300).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      family_id: data.family_id,
      member_name: data.member_name,
      medicine: data.medicine,
      dosage: data.dosage || null,
      time_of_day: data.time_of_day || null,
      days_of_week: data.days_of_week || null,
      active: data.active,
      notes: data.notes || null,
    };
    if (data.id) {
      const { error } = await supabase.from("medicine_reminders").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("medicine_reminders").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============ APPOINTMENT ============
export const upsertAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      member_name: z.string().min(1).max(80),
      doctor: z.string().max(120).nullable().optional(),
      location: z.string().max(200).nullable().optional(),
      scheduled_at: z.string(),
      status: z.enum(["planned", "done", "cancelled"]).default("planned"),
      notes: z.string().max(300).nullable().optional(),
      remind_hours_before: z.number().int().min(0).max(720).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      family_id: data.family_id,
      member_name: data.member_name,
      doctor: data.doctor || null,
      location: data.location || null,
      scheduled_at: data.scheduled_at,
      status: data.status,
      notes: data.notes || null,
      remind_hours_before: data.remind_hours_before ?? 24,
    };
    if (data.id) {
      // Khi cập nhật thời gian/giờ nhắc, reset reminded_at để cron có thể nhắc lại
      const { error } = await supabase
        .from("medical_appointments")
        .update({ ...payload, reminded_at: null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("medical_appointments").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============ HEALTH RECORD ============
export const upsertHealthRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      member_name: z.string().min(1).max(80),
      kind: z.string().min(1).max(40),
      title: z.string().min(1).max(120),
      value: z.string().max(120).nullable().optional(),
      recorded_at: z.string().optional(),
      notes: z.string().max(300).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      family_id: data.family_id,
      member_name: data.member_name,
      kind: data.kind,
      title: data.title,
      value: data.value || null,
      recorded_at: data.recorded_at || new Date().toISOString(),
      notes: data.notes || null,
    };
    if (data.id) {
      const { error } = await supabase.from("health_records").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("health_records").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============ DELETE ============
export const deleteHealthRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      table: z.enum(["health_profiles", "medicine_reminders", "medical_appointments", "health_records"]),
      id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ EMERGENCY READ (security/super_admin during active SOS) ============
export const getEmergencyHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ family_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: profiles, error } = await supabase.rpc("get_health_profiles", { _family_id: data.family_id });
    if (error) throw new Error(error.message);
    return { profiles: (profiles ?? []) as Array<HealthProfileRow & { emergency_unlocked: boolean }> };
  });
