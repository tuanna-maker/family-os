export type EventCategory = "school" | "medical" | "travel" | "family" | "payment" | "medication";
export type EventScope = "all" | "children" | "elderly" | "health" | "travel";

export type FamilyEventRow = {
  id: string;
  title: string;
  category: EventCategory;
  member_scope: EventScope;
  member_name: string | null;
  starts_at: string;
  location: string | null;
  notes: string | null;
  remind_minutes_before: number | null;
};

export declare function listFamilyEvents(data: { family_id: string }): Promise<FamilyEventRow[]>;
export declare function upsertFamilyEvent(data: unknown): Promise<unknown>;
export declare function deleteFamilyEvent(data: { id: string }): Promise<{ ok: boolean }>;
