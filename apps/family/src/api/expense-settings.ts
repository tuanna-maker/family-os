import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type ExpenseCategoryDef = {
  key: string;
  labelVi: string;
  labelEn: string;
  icon: string;
  color: string;
};

export type MonthBudget = {
  total: number;
  byCategory: Record<string, number>;
};

export type ExpenseSettings = {
  categories: ExpenseCategoryDef[];
  budgets: Record<string, MonthBudget>;
};

const FamilyIdSchema = z.object({
  family_id: z.string().uuid(),
});

const SettingsSchema = z.object({
  family_id: z.string().uuid(),
  settings: z.object({
    categories: z.array(
      z.object({
        key: z.string().min(1).max(64),
        labelVi: z.string().min(1).max(80),
        labelEn: z.string().min(1).max(80),
        icon: z.string().min(1).max(16),
        color: z.string().min(4).max(16),
      }),
    ),
    budgets: z.record(
      z.string().regex(/^\d{4}-\d{2}$/),
      z.object({
        total: z.number().int().min(0).max(1_000_000_000_000),
        byCategory: z.record(z.string(), z.number().int().min(0).max(1_000_000_000_000)),
      }),
    ),
  }),
});

function monthKeyToDate(monthKey: string) {
  return `${monthKey}-01`;
}

function dateToMonthKey(date: string) {
  return String(date).slice(0, 7);
}

async function seedFamilyExpenseSettings(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  familyId: string,
) {
  const { error } = await supabase.rpc("seed_family_expense_settings", { _family_id: familyId });
  if (error) throw new Error(error.message);
}

export async function loadExpenseSettings(data: unknown): Promise<ExpenseSettings> {
  const { family_id: familyId } = FamilyIdSchema.parse(data);
  const { supabase } = await requireUser();

  let { data: catRows, error: catErr } = await supabase
    .from("expense_categories")
    .select("category_key, label_vi, label_en, icon, color, sort_order")
    .eq("family_id", familyId)
    .order("sort_order", { ascending: true })
    .order("category_key", { ascending: true });
  if (catErr) throw new Error(catErr.message);

  if (!catRows?.length) {
    await seedFamilyExpenseSettings(supabase, familyId);
    const refetch = await supabase
      .from("expense_categories")
      .select("category_key, label_vi, label_en, icon, color, sort_order")
      .eq("family_id", familyId)
      .order("sort_order", { ascending: true })
      .order("category_key", { ascending: true });
    if (refetch.error) throw new Error(refetch.error.message);
    catRows = refetch.data;
  }

  const [{ data: monthRows, error: monthErr }, { data: catBudgetRows, error: catBudgetErr }] =
    await Promise.all([
      supabase
        .from("expense_month_budgets")
        .select("budget_month, total_amount")
        .eq("family_id", familyId),
      supabase
        .from("expense_category_budgets")
        .select("budget_month, category_key, amount")
        .eq("family_id", familyId),
    ]);
  if (monthErr) throw new Error(monthErr.message);
  if (catBudgetErr) throw new Error(catBudgetErr.message);

  const budgets: Record<string, MonthBudget> = {};
  for (const row of monthRows ?? []) {
    const mk = dateToMonthKey(row.budget_month);
    budgets[mk] = { total: Number(row.total_amount), byCategory: {} };
  }
  for (const row of catBudgetRows ?? []) {
    const mk = dateToMonthKey(row.budget_month);
    if (!budgets[mk]) budgets[mk] = { total: 0, byCategory: {} };
    budgets[mk].byCategory[row.category_key] = Number(row.amount);
  }

  return {
    categories: (catRows ?? []).map((r) => ({
      key: r.category_key,
      labelVi: r.label_vi,
      labelEn: r.label_en,
      icon: r.icon,
      color: r.color,
    })),
    budgets,
  };
}

export async function saveExpenseSettings(data: unknown) {
  const { family_id: familyId, settings } = SettingsSchema.parse(data);
  const { supabase } = await requireUser();

  const { error: delCatErr } = await supabase.from("expense_categories").delete().eq("family_id", familyId);
  if (delCatErr) throw new Error(delCatErr.message);

  const catRows = settings.categories.map((cat, i) => ({
    family_id: familyId,
    category_key: cat.key,
    label_vi: cat.labelVi,
    label_en: cat.labelEn,
    icon: cat.icon,
    color: cat.color,
    sort_order: i,
  }));
  if (catRows.length) {
    const { error: insCatErr } = await supabase.from("expense_categories").insert(catRows);
    if (insCatErr) throw new Error(insCatErr.message);
  }

  const { error: delMonthErr } = await supabase.from("expense_month_budgets").delete().eq("family_id", familyId);
  if (delMonthErr) throw new Error(delMonthErr.message);

  const { error: delCatBudgetErr } = await supabase
    .from("expense_category_budgets")
    .delete()
    .eq("family_id", familyId);
  if (delCatBudgetErr) throw new Error(delCatBudgetErr.message);

  const monthRows = Object.entries(settings.budgets).map(([mk, budget]) => ({
    family_id: familyId,
    budget_month: monthKeyToDate(mk),
    total_amount: budget.total,
  }));
  if (monthRows.length) {
    const { error: insMonthErr } = await supabase.from("expense_month_budgets").insert(monthRows);
    if (insMonthErr) throw new Error(insMonthErr.message);
  }

  const catBudgetRows = Object.entries(settings.budgets).flatMap(([mk, budget]) =>
    Object.entries(budget.byCategory)
      .filter(([, amount]) => amount > 0)
      .map(([category_key, amount]) => ({
        family_id: familyId,
        budget_month: monthKeyToDate(mk),
        category_key,
        amount,
      })),
  );
  if (catBudgetRows.length) {
    const { error: insCatBudgetErr } = await supabase.from("expense_category_budgets").insert(catBudgetRows);
    if (insCatBudgetErr) throw new Error(insCatBudgetErr.message);
  }

  return { ok: true };
}
