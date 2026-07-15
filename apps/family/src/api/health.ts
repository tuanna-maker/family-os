import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

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
export async function listHealth(data: any) {
  const { supabase, userId } = await requireUser();

        const [profiles, meds, appts, recs] = await Promise.all([
      (supabase as any).rpc("get_health_profiles", { _family_id: data.family_id }),
      supabase.from("medicine_reminders").select("*").eq("family_id", data.family_id).order("created_at", { ascending: false }),
      supabase.from("medical_appointments").select("*").eq("family_id", data.family_id).order("scheduled_at"),
      supabase.from("health_records").select("*").eq("family_id", data.family_id).order("recorded_at", { ascending: false }).limit(50),
    ]);
    if (profiles.error) throw new Error(profiles.error.message);
    return {
      profiles: (profiles.data ?? []) as HealthProfileRow[],
      meds: (meds.data ?? []) as MedicineRow[],
      appts: (appts.data ?? []) as AppointmentRow[],
      records: (recs.data ?? []) as HealthRecordRow[],
    };
}

// ============ PROFILES ============
export async function upsertHealthProfile(data: any) {
  const { supabase, userId } = await requireUser();
    const { data: id, error } = await (supabase as any).rpc("upsert_health_profile_enc", {
      _id: data.id ?? null,
      _family_id: data.family_id,
      _name: data.name,
      _dob: data.dob || null,
      _blood_type: data.blood_type || null,
      _allergies: data.allergies || null,
      _conditions: data.conditions || null,
      _notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, id };
}

// ============ MEDICINE ============
export async function upsertMedicine(data: any) {
  const { supabase, userId } = await requireUser();
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
}

// ============ APPOINTMENT ============
export async function upsertAppointment(data: any) {
  const { supabase, userId } = await requireUser();
    const payload = {
      family_id: data.family_id,
      member_name: data.member_name,
      doctor: data.doctor || null,
      location: data.location || null,
      scheduled_at: data.scheduled_at,
      status: data.status,
      notes: data.notes || null,
    };
    if (data.id) {
      const { error } = await supabase.from("medical_appointments").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("medical_appointments").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
}

// ============ HEALTH RECORD ============
export async function upsertHealthRecord(data: any) {
  const { supabase, userId } = await requireUser();
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
}

// ============ DELETE ============
export async function deleteHealthRow(data: any) {
  const { supabase, userId } = await requireUser();

    const { error } = await supabase.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
}
