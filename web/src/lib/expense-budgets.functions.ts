import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEFAULT_CATEGORIES = [
  { name: "Ăn uống", icon: "🍜", color: "#f97316" },
  { name: "Nhà cửa", icon: "🏠", color: "#6366f1" },
  { name: "Con cái", icon: "👶", color: "#ec4899" },
  { name: "Thú cưng", icon: "🐶", color: "#a855f7" },
  { name: "Y tế", icon: "💊", color: "#ef4444" },
  { name: "Di chuyển", icon: "🚗", color: "#0ea5e9" },
  { name: "Giải trí", icon: "🎬", color: "#22c55e" },
  { name: "Khác", icon: "✨", color: "#64748b" },
] as const;

export type CategoryMeta = (typeof DEFAULT_CATEGORIES)[number];

export type MonthlySummary = {
  month: string; // YYYY-MM
  total: number;
  previousTotal: number;
  deltaPct: number; // vs previous
  budget: number;
  remaining: number;
  usagePct: number;
  warningThreshold: number;
  txnCount: number;
};

export type CategoryBreakdown = {
  name: string;
  icon: string;
  color: string;
  amount: number;
  previousAmount: number;
  deltaPct: number;
  budget: number;
};

export type TrendPoint = { month: string; total: number };

function monthStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

const FamilyOnly = z.object({ family_id: z.string().uuid() });
const FamilyMonth = z.object({
  family_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const getMonthlySummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FamilyMonth.parse(d))
  .handler(async ({ data, context }): Promise<MonthlySummary> => {
    const { supabase } = context;
    const now = data.month
      ? new Date(`${data.month}-01T00:00:00Z`)
      : new Date();
    const curStart = monthStart(now);
    const nextStart = new Date(Date.UTC(curStart.getUTCFullYear(), curStart.getUTCMonth() + 1, 1));
    const prevStart = new Date(Date.UTC(curStart.getUTCFullYear(), curStart.getUTCMonth() - 1, 1));

    const [curRes, prevRes, budgetRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("amount")
        .eq("family_id", data.family_id)
        .gte("spent_on", isoDay(curStart))
        .lt("spent_on", isoDay(nextStart)),
      supabase
        .from("expenses")
        .select("amount")
        .eq("family_id", data.family_id)
        .gte("spent_on", isoDay(prevStart))
        .lt("spent_on", isoDay(curStart)),
      supabase
        .from("expense_budgets")
        .select("total_amount, warning_threshold")
        .eq("family_id", data.family_id)
        .eq("month", isoDay(curStart))
        .maybeSingle(),
    ]);

    const total = (curRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const prev = (prevRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const budget = Number(budgetRes.data?.total_amount ?? 0);
    const warningThreshold = budgetRes.data?.warning_threshold ?? 80;

    return {
      month: isoDay(curStart).slice(0, 7),
      total,
      previousTotal: prev,
      deltaPct: prev > 0 ? Math.round(((total - prev) / prev) * 100) : 0,
      budget,
      remaining: Math.max(0, budget - total),
      usagePct: budget > 0 ? Math.min(999, Math.round((total / budget) * 100)) : 0,
      warningThreshold,
      txnCount: (curRes.data ?? []).length,
    };
  });

export const getCategoryBreakdown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FamilyMonth.parse(d))
  .handler(async ({ data, context }): Promise<CategoryBreakdown[]> => {
    const { supabase } = context;
    const now = data.month
      ? new Date(`${data.month}-01T00:00:00Z`)
      : new Date();
    const curStart = monthStart(now);
    const nextStart = new Date(Date.UTC(curStart.getUTCFullYear(), curStart.getUTCMonth() + 1, 1));
    const prevStart = new Date(Date.UTC(curStart.getUTCFullYear(), curStart.getUTCMonth() - 1, 1));

    const [curRes, prevRes, budgetRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("category, amount")
        .eq("family_id", data.family_id)
        .gte("spent_on", isoDay(curStart))
        .lt("spent_on", isoDay(nextStart)),
      supabase
        .from("expenses")
        .select("category, amount")
        .eq("family_id", data.family_id)
        .gte("spent_on", isoDay(prevStart))
        .lt("spent_on", isoDay(curStart)),
      supabase
        .from("expense_budgets")
        .select("per_category")
        .eq("family_id", data.family_id)
        .eq("month", isoDay(curStart))
        .maybeSingle(),
    ]);

    const sumBy = (rows: Array<{ category: string; amount: number | string }>) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        m.set(r.category, (m.get(r.category) ?? 0) + Number(r.amount));
      }
      return m;
    };
    const cur = sumBy(curRes.data ?? []);
    const prev = sumBy(prevRes.data ?? []);
    const budgets = (budgetRes.data?.per_category ?? {}) as Record<string, number>;

    const names = new Set<string>([
      ...DEFAULT_CATEGORIES.map((c) => c.name),
      ...cur.keys(),
      ...prev.keys(),
    ]);
    const out: CategoryBreakdown[] = [];
    for (const name of names) {
      const meta = DEFAULT_CATEGORIES.find((c) => c.name === name) ?? {
        name,
        icon: "✨",
        color: "#64748b",
      };
      const amount = cur.get(name) ?? 0;
      const previousAmount = prev.get(name) ?? 0;
      out.push({
        name,
        icon: meta.icon,
        color: meta.color,
        amount,
        previousAmount,
        deltaPct: previousAmount > 0 ? Math.round(((amount - previousAmount) / previousAmount) * 100) : 0,
        budget: Number(budgets[name] ?? 0),
      });
    }
    return out.sort((a, b) => b.amount - a.amount);
  });

export const getTrend6m = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FamilyOnly.parse(d))
  .handler(async ({ data, context }): Promise<TrendPoint[]> => {
    const { supabase } = context;
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const { data: rows } = await supabase
      .from("expenses")
      .select("amount, spent_on")
      .eq("family_id", data.family_id)
      .gte("spent_on", isoDay(start));

    const map = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
      map.set(d.toISOString().slice(0, 7), 0);
    }
    for (const r of rows ?? []) {
      const key = String(r.spent_on).slice(0, 7);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + Number(r.amount));
    }
    return Array.from(map.entries()).map(([month, total]) => ({ month, total }));
  });

export const getBudget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FamilyMonth.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const now = data.month
      ? new Date(`${data.month}-01T00:00:00Z`)
      : new Date();
    const curStart = monthStart(now);
    const { data: row } = await supabase
      .from("expense_budgets")
      .select("id, month, total_amount, per_category, warning_threshold")
      .eq("family_id", data.family_id)
      .eq("month", isoDay(curStart))
      .maybeSingle();
    return {
      month: isoDay(curStart).slice(0, 7),
      total_amount: Number(row?.total_amount ?? 0),
      per_category: (row?.per_category ?? {}) as Record<string, number>,
      warning_threshold: row?.warning_threshold ?? 80,
    };
  });

const UpsertSchema = z.object({
  family_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  total_amount: z.number().int().min(0).max(10_000_000_000),
  per_category: z.record(z.string().min(1).max(40), z.number().int().min(0).max(10_000_000_000)),
  warning_threshold: z.number().int().min(1).max(100).default(80),
});

export const upsertBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const monthDate = `${data.month}-01`;
    const { error } = await supabase
      .from("expense_budgets")
      .upsert(
        {
          family_id: data.family_id,
          month: monthDate,
          total_amount: data.total_amount,
          per_category: data.per_category,
          warning_threshold: data.warning_threshold,
          created_by: userId,
        },
        { onConflict: "family_id,month" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
