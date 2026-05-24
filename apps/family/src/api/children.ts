import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

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

export async function listChildren(data: any) {
  const { supabase, userId } = await requireUser();

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
}

export async function upsertChild(data: any) {
  const { supabase, userId } = await requireUser();
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
}

export async function upsertSchedule(data: any) {
  const { supabase, userId } = await requireUser();
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
}

export async function upsertHomework(data: any) {
  const { supabase, userId } = await requireUser();
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
}

export async function upsertAchievement(data: any) {
  const { supabase, userId } = await requireUser();
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
}

export async function upsertParentReminder(data: any) {
  const { supabase, userId } = await requireUser();
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
}

export async function toggleHomework(data: any) {
  const { supabase, userId } = await requireUser();

    const { error } = await supabase.from("homeworks").update({ done: data.done }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
}

export async function toggleReminder(data: any) {
  const { supabase, userId } = await requireUser();

    const { error } = await supabase.from("parent_reminders").update({ done: data.done }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
}

export async function deleteChildrenRow(data: any) {
  const { supabase, userId } = await requireUser();

    const { error } = await supabase.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
}
