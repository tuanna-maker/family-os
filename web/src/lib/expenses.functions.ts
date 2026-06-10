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

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ family_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<ExpenseRow[]> => {
    const { supabase } = context;
    const [{ data: exp }, { data: scans }] = await Promise.all([
      supabase
        .from("expenses")
        .select("id, title, category, amount, spent_on, note, created_at")
        .eq("family_id", data.family_id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("receipt_scans")
        .select("id, merchant, category, total, scanned_date, created_at, expense_id")
        .eq("family_id", data.family_id)
        .is("expense_id", null)
        .order("created_at", { ascending: false })
        .limit(20),
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
