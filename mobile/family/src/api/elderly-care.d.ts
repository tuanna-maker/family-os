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
  title: string;
  value: string | null;
  recorded_at: string;
};

export type ActivityRow = {
  id: string;
  kind: "med" | "check" | "note" | "vital";
  title: string;
  detail: string;
  at: string;
};

export type SafeCheckRow = {
  id: string;
  status: "ok" | "warn" | "alert";
  note: string | null;
  checked_at: string;
  author_name: string | null;
};

export declare function listElderlyProfiles(data: { familyId: string }): Promise<ElderlyProfileRow[]>;
export declare function createElderlyProfile(data: {
  family_id: string;
  name: string;
  age?: number;
  relation?: string;
  phone?: string;
  conditions?: string[];
}): Promise<{ id: string }>;
export declare function updateElderlyProfile(data: {
  id: string;
  name?: string;
  age?: number | null;
  relation?: string | null;
  phone?: string | null;
  address?: string | null;
  conditions?: string[];
  doctor?: string | null;
}): Promise<{ ok: boolean }>;
export declare function deleteElderlyProfile(data: { id: string }): Promise<{ ok: boolean }>;
export declare function listMedicineWeek(data: {
  familyId: string;
  memberName: string;
  days?: number;
}): Promise<
  Array<{
    date: string;
    entries: Array<{
      reminder_id: string;
      medicine: string;
      time_of_day: string | null;
      taken: boolean;
    }>;
  }>
>;
export declare function addVital(data: {
  family_id: string;
  member_name: string;
  kind: string;
  title: string;
  value?: string | null;
  notes?: string | null;
}): Promise<{ ok: boolean }>;
export declare function confirmSafeCheck(data: {
  elderly_id: string;
  family_id: string;
  status: "ok" | "warn" | "alert";
  note?: string;
}): Promise<{ ok: boolean }>;
export declare function listSafeChecks(data: { elderlyId: string; limit?: number }): Promise<SafeCheckRow[]>;
export declare function listMedicineReminders(data: {
  familyId: string;
  memberName: string;
}): Promise<MedicineReminderRow[]>;
export declare function createMedicineReminder(data: {
  family_id: string;
  member_name: string;
  medicine: string;
  dosage?: string;
  time_of_day?: string;
}): Promise<{ id: string }>;
export declare function markMedicineTaken(data: {
  reminder_id: string;
  family_id: string;
  taken_at?: string;
  note?: string;
}): Promise<{ ok: boolean }>;
export declare function undoMedicineTaken(data: { reminder_id: string }): Promise<{ ok: boolean }>;
export declare function listCareNotes(data: { elderlyId: string }): Promise<CareNoteRow[]>;
export declare function addCareNote(data: {
  elderly_id: string;
  family_id: string;
  content: string;
  author_name: string;
}): Promise<CareNoteRow>;
export declare function listVitals(data: { familyId: string; memberName: string }): Promise<VitalRow[]>;
export declare function listElderlyActivity(data: {
  elderlyId: string;
  familyId: string;
}): Promise<ActivityRow[]>;
export declare function listCareTimeline(data: {
  elderlyId: string;
  familyId: string;
  memberName: string;
  days: number;
}): Promise<ActivityRow[]>;
