import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Fam = z.object({ family_id: z.string().uuid() });

export type DashboardSummary = {
  medicines: {
    total_active: number;
    items: Array<{ id: string; medicine: string; member_name: string; time_of_day: string | null }>;
  };
  parent_reminders: {
    pending: number;
    items: Array<{ id: string; title: string; remind_at: string; child_id: string | null }>;
  };
  homeworks: {
    pending: number;
    overdue: number;
    items: Array<{ id: string; title: string; subject: string; due_date: string | null; child_id: string }>;
  };
  food: {
    expiring_soon: number;
    expired: number;
    items: Array<{ id: string; name: string; expires_on: string | null; qty: number | null; unit: string | null }>;
  };
  shopping: { pending: number };
  appointments: {
    upcoming: number;
    items: Array<{ id: string; member_name: string; doctor: string | null; scheduled_at: string }>;
  };
  security: {
    open: number;
    items: Array<{ id: string; request_type: string; status: string; created_at: string }>;
  };
  expenses_month: { total: number; count: number };
  expenses_prev_month: { total: number };
  children: Array<{ id: string; name: string; dob: string | null; today_count: number }>;
  member_count: number;
  next_medicine: { id: string; medicine: string; member_name: string; time_of_day: string | null } | null;
  next_appointment: { id: string; member_name: string; doctor: string | null; scheduled_at: string } | null;
};

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Fam.parse(d))
  .handler(async ({ data, context }): Promise<DashboardSummary> => {
    const { supabase } = context;
    const fid = data.family_id;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const in3Days = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const prevMonthEnd = monthStart;

    const [meds, reminders, hws, foods, shop, appts, sec, exp, expPrev, kids, members] = await Promise.all([
      supabase
        .from("medicine_reminders")
        .select("id, medicine, member_name, time_of_day, active")
        .eq("family_id", fid)
        .eq("active", true)
        .order("time_of_day", { ascending: true })
        .limit(50),
      supabase
        .from("parent_reminders")
        .select("id, title, remind_at, child_id, done")
        .eq("family_id", fid)
        .eq("done", false)
        .order("remind_at", { ascending: true })
        .limit(50),
      supabase
        .from("homeworks")
        .select("id, title, subject, due_date, child_id, done")
        .eq("family_id", fid)
        .eq("done", false)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(50),
      supabase
        .from("food_items")
        .select("id, name, expires_on, qty, unit")
        .eq("family_id", fid)
        .not("expires_on", "is", null)
        .lte("expires_on", in3Days)
        .order("expires_on", { ascending: true })
        .limit(50),
      supabase
        .from("shopping_items")
        .select("id", { count: "exact", head: true })
        .eq("family_id", fid)
        .eq("purchased", false),
      supabase
        .from("medical_appointments")
        .select("id, member_name, doctor, scheduled_at, status")
        .eq("family_id", fid)
        .gte("scheduled_at", now.toISOString())
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(20),
      supabase
        .from("security_requests")
        .select("id, request_type, status, created_at")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("expenses")
        .select("amount")
        .eq("family_id", fid)
        .gte("spent_on", monthStart),
      supabase
        .from("expenses")
        .select("amount")
        .eq("family_id", fid)
        .gte("spent_on", prevMonthStart)
        .lt("spent_on", prevMonthEnd),
      supabase
        .from("children")
        .select("id, name, dob")
        .eq("family_id", fid)
        .order("created_at"),
      supabase
        .from("family_members")
        .select("id", { count: "exact", head: true })
        .eq("family_id", fid),
    ]);

    const medsList = meds.data ?? [];
    const remList = reminders.data ?? [];
    const hwList = hws.data ?? [];
    const foodList = foods.data ?? [];
    const apptList = appts.data ?? [];
    const secList = sec.data ?? [];
    const expList = (exp.data ?? []) as Array<{ amount: number }>;
    const expPrevList = (expPrev.data ?? []) as Array<{ amount: number }>;
    const kidsList = (kids.data ?? []) as Array<{ id: string; name: string; dob: string | null }>;

    const expired = foodList.filter((f) => f.expires_on && f.expires_on < todayStr).length;
    const expiring = foodList.length - expired;
    const overdue = hwList.filter((h) => h.due_date && h.due_date < todayStr).length;

    // Count today's items per child (reminders due today + homeworks due today)
    const childToday = new Map<string, number>();
    for (const r of remList) {
      if (!r.child_id) continue;
      if (r.remind_at?.slice(0, 10) === todayStr) {
        childToday.set(r.child_id, (childToday.get(r.child_id) ?? 0) + 1);
      }
    }
    for (const h of hwList) {
      if (!h.child_id) continue;
      if (h.due_date === todayStr) {
        childToday.set(h.child_id, (childToday.get(h.child_id) ?? 0) + 1);
      }
    }

    // Pick the next-upcoming medicine (compare HH:MM today; else first)
    const nowHHMM = now.toTimeString().slice(0, 5);
    const upcomingMed =
      medsList.find((m) => (m.time_of_day ?? "").slice(0, 5) >= nowHHMM) ?? medsList[0] ?? null;

    return {
      medicines: {
        total_active: medsList.length,
        items: medsList.slice(0, 5).map((m) => ({
          id: m.id,
          medicine: m.medicine,
          member_name: m.member_name,
          time_of_day: m.time_of_day,
        })),
      },
      parent_reminders: { pending: remList.length, items: remList.slice(0, 5) },
      homeworks: { pending: hwList.length, overdue, items: hwList.slice(0, 5) },
      food: { expiring_soon: expiring, expired, items: foodList.slice(0, 5) },
      shopping: { pending: shop.count ?? 0 },
      appointments: { upcoming: apptList.length, items: apptList.slice(0, 5) },
      security: { open: secList.length, items: secList.slice(0, 5) },
      expenses_month: {
        total: expList.reduce((s, r) => s + Number(r.amount ?? 0), 0),
        count: expList.length,
      },
      expenses_prev_month: {
        total: expPrevList.reduce((s, r) => s + Number(r.amount ?? 0), 0),
      },
      children: kidsList.map((k) => ({
        id: k.id,
        name: k.name,
        dob: k.dob,
        today_count: childToday.get(k.id) ?? 0,
      })),
      member_count: members.count ?? 0,
      next_medicine: upcomingMed
        ? {
            id: upcomingMed.id,
            medicine: upcomingMed.medicine,
            member_name: upcomingMed.member_name,
            time_of_day: upcomingMed.time_of_day,
          }
        : null,
      next_appointment: apptList[0]
        ? {
            id: apptList[0].id,
            member_name: apptList[0].member_name,
            doctor: apptList[0].doctor,
            scheduled_at: apptList[0].scheduled_at,
          }
        : null,
    };
  });
