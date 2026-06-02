import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const listFamilyEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Fam.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
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
  });

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

export const upsertFamilyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EventInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, created_by: userId };
    if (data.id) {
      const { id, ...rest } = payload;
      const { error } = await supabase
        .from("family_events")
        .update(rest)
        .eq("id", id!);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await supabase
      .from("family_events")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const deleteFamilyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("family_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Materialize due reminders for upcoming events into the notifications table.
// Best-effort, idempotent via dedupe_key. Safe to call from client on dashboard mount.
export const materializeEventReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ family_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = Date.now();
    const windowEnd = new Date(now + 7 * 86_400_000).toISOString(); // next 7 days
    const { data: rows, error } = await supabase
      .from("family_events")
      .select("id, title, starts_at, remind_minutes_before, location, category")
      .eq("family_id", data.family_id)
      .not("remind_minutes_before", "is", null)
      .gte("starts_at", new Date(now).toISOString())
      .lte("starts_at", windowEnd);
    if (error) return { inserted: 0 };

    const due = (rows ?? []).filter((r) => {
      const t = new Date(r.starts_at as string).getTime();
      const lead = ((r.remind_minutes_before as number | null) ?? 0) * 60_000;
      return t - lead <= now && t > now;
    });
    if (due.length === 0) return { inserted: 0 };

    const payloads = due.map((r) => ({
      user_id: userId,
      family_id: data.family_id,
      type: "family.event.reminder",
      ref_id: r.id as string,
      title: `Sắp tới: ${r.title}`,
      body: `${new Date(r.starts_at as string).toLocaleString("vi-VN")}${r.location ? ` · ${r.location}` : ""}`,
      due_at: r.starts_at as string,
      dedupe_key: `event-reminder:${r.id}:${userId}`,
    }));
    const { error: insErr, count } = await supabase
      .from("notifications")
      .upsert(payloads, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true, count: "exact" });
    if (insErr) return { inserted: 0 };
    return { inserted: count ?? 0 };
  });
