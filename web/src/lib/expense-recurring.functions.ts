import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RecurringRule = {
  id: string;
  family_id: string;
  title: string;
  category: string;
  amount: number;
  merchant: string | null;
  note: string | null;
  payment_method: string | null;
  payer_id: string | null;
  frequency: "daily" | "weekly" | "monthly";
  day_of_month: number | null;
  weekday: number | null;
  next_run_at: string;
  last_run_at: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
};

const FamilyOnly = z.object({ family_id: z.string().uuid() });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  family_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(40).default("Khác"),
  amount: z.number().int().min(0).max(1_000_000_000),
  merchant: z.string().max(120).optional().nullable(),
  note: z.string().max(200).optional().nullable(),
  payment_method: z.string().max(40).optional().nullable(),
  payer_id: z.string().uuid().optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  day_of_month: z.number().int().min(1).max(31).optional().nullable(),
  weekday: z.number().int().min(0).max(6).optional().nullable(),
  next_run_at: z.string().min(8),
  active: z.boolean().default(true),
});

export const listRecurring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FamilyOnly.parse(d))
  .handler(async ({ data, context }): Promise<RecurringRule[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("expense_recurring_rules")
      .select("*")
      .eq("family_id", data.family_id)
      .order("next_run_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as RecurringRule[];
  });

export const upsertRecurring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      family_id: data.family_id,
      title: data.title,
      category: data.category,
      amount: data.amount,
      merchant: data.merchant ?? null,
      note: data.note ?? null,
      payment_method: data.payment_method ?? null,
      payer_id: data.payer_id ?? null,
      frequency: data.frequency,
      day_of_month: data.day_of_month ?? null,
      weekday: data.weekday ?? null,
      next_run_at: data.next_run_at,
      active: data.active,
      created_by: userId,
    };
    if (data.id) {
      const { error } = await supabase
        .from("expense_recurring_rules")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await supabase
      .from("expense_recurring_rules")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id as string };
  });

export const deleteRecurring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expense_recurring_rules")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleRecurring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expense_recurring_rules")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runRecurringNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("tick_expense_recurring");
    if (error) throw new Error(error.message);
    return { processed: Number(data ?? 0) };
  });
