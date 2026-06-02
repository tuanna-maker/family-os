import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExpenseNotification = {
  id: string;
  user_id: string;
  family_id: string | null;
  type: string;
  title: string;
  body: string | null;
  due_at: string | null;
  read_at: string | null;
  ref_id: string | null;
  created_at: string;
};

const FamilyOnly = z.object({ family_id: z.string().uuid() });

/** Trigger budget + recurring checks for a family. Anyone in family can run. */
export const runExpenseChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => FamilyOnly.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [budget, recurring] = await Promise.all([
      supabase.rpc("check_expense_budget_alerts", { _family_id: data.family_id }),
      supabase.rpc("check_expense_recurring_due", { _family_id: data.family_id }),
    ]);
    if (budget.error) throw new Error(budget.error.message);
    if (recurring.error) throw new Error(recurring.error.message);
    return {
      budgetAlerts: Number(budget.data ?? 0),
      recurringAlerts: Number(recurring.data ?? 0),
    };
  });

/** List my unread expense-related notifications. */
export const listExpenseNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ family_id: z.string().uuid().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("notifications")
      .select("id,user_id,family_id,type,title,body,due_at,read_at,ref_id,created_at")
      .eq("user_id", userId)
      .like("type", "expense_%")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.family_id) q = q.eq("family_id", data.family_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { notifications: (rows ?? []) as ExpenseNotification[] };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllExpenseNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ family_id: z.string().uuid().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .like("type", "expense_%")
      .is("read_at", null);
    if (data.family_id) q = q.eq("family_id", data.family_id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
