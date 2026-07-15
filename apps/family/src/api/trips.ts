import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type FamilyTrip = {
  id: string;
  family_id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  members_count: number;
  budget_planned: number;
  status: string;
  notes: string | null;
  created_at: string;
};

export type TripItem = {
  id: string;
  trip_id: string;
  kind: "checklist" | "packing" | "budget";
  label: string;
  assignee: string | null;
  amount: number | null;
  done: boolean;
  position: number;
};

export async function listTrips(data: { family_id: string }) {
  const { supabase } = await requireUser();
  const { family_id } = z.object({ family_id: z.string().uuid() }).parse(data);
  const { data: rows, error } = await supabase
    .from("family_trips")
    .select(
      "id,family_id,title,destination,start_date,end_date,members_count,budget_planned,status,notes,created_at",
    )
    .eq("family_id", family_id)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (rows ?? []) as FamilyTrip[];
}

export async function getTripBundle(data: { trip_id: string }) {
  const { supabase } = await requireUser();
  const { trip_id } = z.object({ trip_id: z.string().uuid() }).parse(data);
  const { data: trip, error } = await supabase
    .from("family_trips")
    .select(
      "id,family_id,title,destination,start_date,end_date,members_count,budget_planned,status,notes,created_at",
    )
    .eq("id", trip_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!trip) throw new Error("Không tìm thấy chuyến đi");
  const { data: items, error: iErr } = await supabase
    .from("family_trip_items")
    .select("id,trip_id,kind,label,assignee,amount,done,position")
    .eq("trip_id", trip_id)
    .order("position")
    .order("created_at");
  if (iErr) throw new Error(iErr.message);
  return { trip: trip as FamilyTrip, items: (items ?? []) as TripItem[] };
}

export async function upsertTrip(data: {
  id?: string;
  family_id: string;
  title: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  members_count?: number;
  budget_planned?: number;
  status?: string;
  notes?: string;
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      family_id: z.string().uuid(),
      title: z.string().min(1).max(120),
      destination: z.string().max(120).optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      members_count: z.number().min(1).max(50).optional(),
      budget_planned: z.number().min(0).optional(),
      status: z.enum(["planning", "upcoming", "ongoing", "done", "cancelled"]).optional(),
      notes: z.string().max(500).optional(),
    })
    .parse(data);
  const payload = {
    family_id: parsed.family_id,
    title: parsed.title,
    destination: parsed.destination ?? null,
    start_date: parsed.start_date ?? null,
    end_date: parsed.end_date ?? null,
    members_count: parsed.members_count ?? 1,
    budget_planned: parsed.budget_planned ?? 0,
    status: parsed.status ?? "planning",
    notes: parsed.notes ?? null,
    created_by: userId,
  };
  if (parsed.id) {
    const { error } = await supabase.from("family_trips").update(payload).eq("id", parsed.id);
    if (error) throw new Error(error.message);
    return { id: parsed.id };
  }
  const { data: row, error } = await supabase.from("family_trips").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: row.id as string };
}

export async function deleteTrip(data: { id: string }) {
  const { supabase } = await requireUser();
  const { id } = z.object({ id: z.string().uuid() }).parse(data);
  const { error } = await supabase.from("family_trips").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function upsertTripItem(data: {
  id?: string;
  trip_id: string;
  kind: TripItem["kind"];
  label: string;
  assignee?: string;
  amount?: number;
}) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      trip_id: z.string().uuid(),
      kind: z.enum(["checklist", "packing", "budget"]),
      label: z.string().min(1).max(200),
      assignee: z.string().max(80).optional(),
      amount: z.number().min(0).optional(),
    })
    .parse(data);
  const payload = {
    trip_id: parsed.trip_id,
    kind: parsed.kind,
    label: parsed.label,
    assignee: parsed.assignee ?? null,
    amount: parsed.amount ?? null,
  };
  if (parsed.id) {
    const { error } = await supabase.from("family_trip_items").update(payload).eq("id", parsed.id);
    if (error) throw new Error(error.message);
    return { id: parsed.id };
  }
  const { data: row, error } = await supabase
    .from("family_trip_items")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: row.id as string };
}

export async function toggleTripItem(data: { id: string; done: boolean }) {
  const { supabase } = await requireUser();
  const parsed = z.object({ id: z.string().uuid(), done: z.boolean() }).parse(data);
  const { error } = await supabase.from("family_trip_items").update({ done: parsed.done }).eq("id", parsed.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteTripItem(data: { id: string }) {
  const { supabase } = await requireUser();
  const { id } = z.object({ id: z.string().uuid() }).parse(data);
  const { error } = await supabase.from("family_trip_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
