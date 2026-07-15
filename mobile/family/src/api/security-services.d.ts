export const HOLD_PLANS: readonly ["standard", "extended", "long_term"];
export const ITEM_TYPES: readonly ["package", "food", "fragile", "document", "other"];
export const HOLD_PLAN_META: Record<string, { label: string; sub: string; price: string }>;
export const COURIERS: readonly { id: string; label: string; fee: number }[];
export const DELIVERY_OPTIONS: readonly { id: string; label: string; fee: number }[];
export const CARE_DURATIONS: readonly { id: string; label: string; hours: number; fee: number }[];
export const ESCORT_BASE_FEE: number;
export const FREIGHT_WEIGHTS: readonly { id: string; label: string }[];
export const GUARD_TASKS: readonly { id: string; label: string; fee: number }[];
export const HOURLY_GUARD_RATE: number;
export const CUSTOM_GUARD_SERVICES: readonly { id: string; label: string }[];

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

export declare function createPackageHold(data: Record<string, unknown>): Promise<{
  id: string;
  ticket_code: string | null;
  created_at: string;
}>;
export declare function createPackageShip(data: Record<string, unknown>): Promise<{ id: string }>;
export declare function createApartmentDelivery(data: Record<string, unknown>): Promise<{ id: string }>;
export declare function createHomeCare(data: Record<string, unknown>): Promise<{ id: string }>;
export declare function createEscort(data: Record<string, unknown>): Promise<{ id: string }>;
export declare function createRemoteFreight(data: Record<string, unknown>): Promise<{ id: string }>;
export declare function createGuardHandle(data: Record<string, unknown>): Promise<{ id: string }>;
export declare function createHourlyGuard(data: Record<string, unknown>): Promise<{ id: string }>;
export declare function createCustomGuard(data: Record<string, unknown>): Promise<{ id: string }>;
export declare function listProjectGuards(): Promise<{ project_id: string; guards: ProjectGuard[] }>;
export declare function listProjectGuardSchedule(range: {
  from: string;
  to: string;
}): Promise<{ project_id: string; shifts: ProjectGuardShift[] }>;
