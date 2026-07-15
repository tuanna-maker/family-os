export type MedicineRow = { id: string; member_name: string; medicine: string; time_of_day: string | null; active: boolean };
export type AppointmentRow = { id: string; member_name: string; doctor: string | null; scheduled_at: string; status: string };
export type HealthProfileRow = {
  id: string;
  name: string;
  dob: string | null;
  blood_type: string | null;
  allergies?: string | null;
  conditions?: string | null;
};

export declare function listHealth(data: { family_id: string }): Promise<{
  profiles: HealthProfileRow[];
  meds: MedicineRow[];
  appts: AppointmentRow[];
  records: unknown[];
}>;
export declare function upsertHealthProfile(data: unknown): Promise<{ ok: boolean; id?: string }>;
export declare function upsertMedicine(data: unknown): Promise<{ ok: boolean }>;
export declare function upsertAppointment(data: unknown): Promise<{ ok: boolean }>;
export declare function deleteHealthRow(data: { table: string; id: string }): Promise<{ ok: boolean }>;
