export type FamilyTrip = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  members_count: number;
  budget_planned: number;
  status: string;
};
export type TripItem = {
  id: string;
  trip_id: string;
  kind: "checklist" | "packing" | "budget";
  label: string;
  amount: number | null;
  done: boolean;
};

export declare function listTrips(data: { family_id: string }): Promise<FamilyTrip[]>;
export declare function getTripBundle(data: { trip_id: string }): Promise<{ trip: FamilyTrip; items: TripItem[] }>;
export declare function upsertTrip(data: unknown): Promise<{ ok: boolean }>;
export declare function deleteTrip(data: { id: string }): Promise<{ ok: boolean }>;
export declare function upsertTripItem(data: unknown): Promise<{ ok: boolean }>;
export declare function toggleTripItem(data: { id: string; done: boolean }): Promise<{ ok: boolean }>;
export declare function deleteTripItem(data: { id: string }): Promise<{ ok: boolean }>;
