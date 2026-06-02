import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number;
  spent_on: string;
  note: string | null;
  created_at: string;
  source: "manual" | "scan";
};

const CreateSchema = z.object({
  family_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(40),
  amount: z.number().int().min(0).max(1_000_000_000),
  spent_on: z.string().min(1).max(40),
  note: z.string().max(200).optional(),
  scan_id: z.string().uuid().optional(),
});

const ListSchema = z.object({
  family_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

function monthRange(month?: string) {
  const now = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString().slice(0, 10), next: next.toISOString().slice(0, 10) };
}

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data, context }): Promise<ExpenseRow[]> => {
    const { supabase } = context;
    const { start, next } = monthRange(data.month);
    const [{ data: exp }, { data: scans }] = await Promise.all([
      supabase
        .from("expenses")
        .select("id, title, category, amount, spent_on, note, created_at")
        .eq("family_id", data.family_id)
        .gte("spent_on", start)
        .lt("spent_on", next)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("receipt_scans")
        .select("id, merchant, category, total, scanned_date, created_at, expense_id")
        .eq("family_id", data.family_id)
        .is("expense_id", null)
        .gte("created_at", `${start}T00:00:00Z`)
        .lt("created_at", `${next}T00:00:00Z`)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const out: ExpenseRow[] = (exp ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: Number(e.amount),
      spent_on: e.spent_on,
      note: e.note,
      created_at: e.created_at,
      source: "manual",
    }));
    for (const s of scans ?? []) {
      out.push({
        id: s.id,
        title: s.merchant ?? "Hoá đơn",
        category: s.category ?? "Khác",
        amount: Number(s.total ?? 0),
        spent_on: s.scanned_date ?? s.created_at,
        note: null,
        created_at: s.created_at,
        source: "scan",
      });
    }
    return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  });

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("expenses")
      .insert({
        family_id: data.family_id,
        created_by: userId,
        title: data.title,
        category: data.category,
        amount: data.amount,
        spent_on: data.spent_on,
        note: data.note ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.scan_id) {
      await supabase
        .from("receipt_scans")
        .update({ expense_id: inserted.id })
        .eq("id", data.scan_id);
    }
    return { id: inserted.id };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReceiptScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("receipt_scans")
      .delete()
      .eq("id", data.id)
      .is("expense_id", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(40),
  amount: z.number().int().min(0).max(1_000_000_000),
  spent_on: z.string().min(1).max(40),
  note: z.string().max(200).optional(),
});

export const updateExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("expenses")
      .update({
        title: data.title,
        category: data.category,
        amount: data.amount,
        spent_on: data.spent_on,
        note: data.note ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
