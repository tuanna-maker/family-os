import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Fam = z.object({ family_id: z.string().uuid() });

export type ChildRow = {
  id: string;
  name: string;
  dob: string | null;
  school: string | null;
  grade: string | null;
  avatar: string | null;
  notes: string | null;
};
export type ScheduleRow = {
  id: string;
  child_id: string;
  day_of_week: number;
  subject: string;
  time_start: string | null;
  time_end: string | null;
  room: string | null;
};
export type HomeworkRow = {
  id: string;
  child_id: string;
  subject: string;
  title: string;
  due_date: string | null;
  done: boolean;
  notes: string | null;
};
export type AchievementRow = {
  id: string;
  child_id: string;
  title: string;
  kind: string | null;
  earned_at: string;
  notes: string | null;
};
export type ParentReminderRow = {
  id: string;
  child_id: string | null;
  title: string;
  remind_at: string;
  done: boolean;
  notes: string | null;
};

export const listChildren = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Fam.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [kids, schedules, homeworks, achievements, reminders] = await Promise.all([
      supabase.from("children").select("*").eq("family_id", data.family_id).order("created_at"),
      supabase.from("school_schedules").select("*").eq("family_id", data.family_id).order("day_of_week"),
      supabase.from("homeworks").select("*").eq("family_id", data.family_id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("achievements").select("*").eq("family_id", data.family_id).order("earned_at", { ascending: false }).limit(30),
      supabase.from("parent_reminders").select("*").eq("family_id", data.family_id).order("remind_at"),
    ]);
    return {
      children: (kids.data ?? []) as ChildRow[],
      schedules: (schedules.data ?? []) as ScheduleRow[],
      homeworks: (homeworks.data ?? []) as HomeworkRow[],
      achievements: (achievements.data ?? []) as AchievementRow[],
      reminders: (reminders.data ?? []) as ParentReminderRow[],
    };
  });

export const upsertChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      name: z.string().min(1).max(80),
      dob: z.string().nullable().optional(),
      school: z.string().max(120).nullable().optional(),
      grade: z.string().max(40).nullable().optional(),
      avatar: z.string().max(8).nullable().optional(),
      notes: z.string().max(300).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      family_id: data.family_id,
      name: data.name,
      dob: data.dob || null,
      school: data.school || null,
      grade: data.grade || null,
      avatar: data.avatar || null,
      notes: data.notes || null,
    };
    if (data.id) {
      const { error } = await supabase.from("children").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("children").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const upsertSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      child_id: z.string().uuid(),
      day_of_week: z.number().int().min(0).max(6),
      subject: z.string().min(1).max(80),
      time_start: z.string().max(10).nullable().optional(),
      time_end: z.string().max(10).nullable().optional(),
      room: z.string().max(40).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      time_start: data.time_start || null,
      time_end: data.time_end || null,
      room: data.room || null,
    };
    if (id) {
      const { error } = await supabase.from("school_schedules").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("school_schedules").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const upsertHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      child_id: z.string().uuid(),
      subject: z.string().min(1).max(80),
      title: z.string().min(1).max(200),
      due_date: z.string().nullable().optional(),
      done: z.boolean().default(false),
      notes: z.string().max(300).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      due_date: data.due_date || null,
      notes: data.notes || null,
    };
    if (id) {
      const { error } = await supabase.from("homeworks").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("homeworks").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const upsertAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      child_id: z.string().uuid(),
      title: z.string().min(1).max(200),
      kind: z.string().max(60).nullable().optional(),
      earned_at: z.string().optional(),
      notes: z.string().max(300).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      kind: data.kind || null,
      earned_at: data.earned_at || new Date().toISOString().slice(0, 10),
      notes: data.notes || null,
    };
    if (id) {
      const { error } = await supabase.from("achievements").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("achievements").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const upsertParentReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      child_id: z.string().uuid().nullable().optional(),
      title: z.string().min(1).max(200),
      remind_at: z.string(),
      done: z.boolean().default(false),
      notes: z.string().max(300).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      child_id: data.child_id || null,
      notes: data.notes || null,
    };
    if (id) {
      const { error } = await supabase.from("parent_reminders").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("parent_reminders").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const toggleHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("homeworks").update({ done: data.done }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("parent_reminders").update({ done: data.done }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChildrenRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      table: z.enum(["children", "school_schedules", "homeworks", "achievements", "parent_reminders"]),
      id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
