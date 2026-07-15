import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type EventCategory =
  | "school"
  | "medical"
  | "travel"
  | "family"
  | "payment"
  | "medication";
export type EventScope = "all" | "children" | "elderly" | "health" | "travel";

export type FamilyEventRow = {
  id: string;
  family_id: string;
  title: string;
  notes: string | null;
  category: EventCategory;
  member_scope: EventScope;
  member_name: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  remind_minutes_before: number | null;
  status: string;
};

const Fam = z.object({
  family_id: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function listFamilyEvents(data: any) {
  const { supabase, userId } = await requireUser();

        let q = supabase
      .from("family_events")
      .select("*")
      .eq("family_id", data.family_id)
      .order("starts_at", { ascending: true });
    if (data.from) q = q.gte("starts_at", data.from);
    if (data.to) q = q.lte("starts_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as FamilyEventRow[];
}

const EventInput = z.object({
  family_id: z.string().uuid(),
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  notes: z.string().max(2000).nullable().optional(),
  category: z.enum(["school", "medical", "travel", "family", "payment", "medication"]),
  member_scope: z.enum(["all", "children", "elderly", "health", "travel"]).default("all"),
  member_name: z.string().max(120).nullable().optional(),
  starts_at: z.string(),
  ends_at: z.string().nullable().optional(),
  all_day: z.boolean().default(false),
  location: z.string().max(255).nullable().optional(),
  remind_minutes_before: z.number().int().min(0).max(10080).nullable().optional(),
});

export async function upsertFamilyEvent(data: any) {
  const { supabase, userId } = await requireUser();
  const parsed = EventInput.parse(data);
  const payload = {
    family_id: parsed.family_id,
    title: parsed.title,
    notes: parsed.notes ?? null,
    category: parsed.category,
    member_scope: parsed.member_scope,
    member_name: parsed.member_name ?? null,
    starts_at: parsed.starts_at,
    ends_at: parsed.ends_at ?? null,
    all_day: parsed.all_day,
    location: parsed.location ?? null,
    remind_minutes_before: parsed.remind_minutes_before ?? null,
    created_by: userId,
  };
  if (parsed.id) {
    const { created_by: _cb, ...updatePayload } = payload;
    const { error } = await supabase.from("family_events").update(updatePayload).eq("id", parsed.id);
    if (error) throw new Error(error.message);
    return { ok: true, id: parsed.id };
  }
  const { data: row, error } = await supabase
    .from("family_events")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { ok: true, id: row.id as string };
}

export async function deleteFamilyEvent(data: any) {
  const { supabase, userId } = await requireUser();

        const { error } = await supabase.from("family_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
}
