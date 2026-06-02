import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TripStatus = "planning" | "upcoming" | "ongoing" | "done" | "cancelled";
export type TripItemKind = "checklist" | "packing" | "budget";

export type TripRow = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  members_count: number;
  budget_planned: number;
  status: TripStatus;
  notes: string | null;
};

export type TripItemRow = {
  id: string;
  trip_id: string;
  kind: TripItemKind;
  label: string;
  assignee: string | null;
  amount: number | null;
  done: boolean;
  position: number;
};

export const listTrips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { familyId: string }) =>
    z.object({ familyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<TripRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("family_trips")
      .select("id,title,destination,start_date,end_date,members_count,budget_planned,status,notes")
      .eq("family_id", data.familyId)
      .order("start_date", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as TripRow[];
  });

export const getTripWithItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tripId: string }) =>
    z.object({ tripId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: trip, error: e1 }, { data: items, error: e2 }] = await Promise.all([
      supabase.from("family_trips").select("*").eq("id", data.tripId).maybeSingle(),
      supabase
        .from("family_trip_items")
        .select("id,trip_id,kind,label,assignee,amount,done,position")
        .eq("trip_id", data.tripId)
        .order("position", { ascending: true }),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    return { trip: trip as TripRow | null, items: (items ?? []) as TripItemRow[] };
  });

export const createTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      familyId: z.string().uuid(),
      title: z.string().min(1).max(120),
      destination: z.string().max(120).optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      members_count: z.number().int().min(1).max(50).default(1),
      budget_planned: z.number().min(0).max(1e10).default(0),
      notes: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("family_trips")
      .insert({
        family_id: data.familyId,
        title: data.title,
        destination: data.destination ?? null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        members_count: data.members_count,
        budget_planned: data.budget_planned,
        notes: data.notes ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(120).optional(),
      destination: z.string().max(120).nullable().optional(),
      start_date: z.string().nullable().optional(),
      end_date: z.string().nullable().optional(),
      members_count: z.number().int().min(1).max(50).optional(),
      budget_planned: z.number().min(0).max(1e10).optional(),
      status: z.enum(["planning","upcoming","ongoing","done","cancelled"]).optional(),
      notes: z.string().max(1000).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { error } = await supabase.from("family_trips").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_trips").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTripItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      trip_id: z.string().uuid(),
      kind: z.enum(["checklist","packing","budget"]),
      label: z.string().min(1).max(160),
      assignee: z.string().max(80).optional(),
      amount: z.number().min(0).max(1e10).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("family_trip_items").insert({
      trip_id: data.trip_id,
      kind: data.kind,
      label: data.label,
      assignee: data.assignee ?? null,
      amount: data.amount ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleTripItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), done: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("family_trip_items").update({ done: data.done }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTripItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("family_trip_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
