export type ChildRow = {
  id: string;
  name: string;
  dob: string | null;
  school: string | null;
  grade: string | null;
  avatar: string | null;
  notes?: string | null;
};
export type HomeworkRow = { id: string; child_id: string; subject: string; title: string; due_date: string | null; done: boolean };
export type ParentReminderRow = { id: string; child_id: string | null; title: string; remind_at: string; done: boolean };
export type ScheduleRow = { id: string; child_id: string; day_of_week: number; subject: string; time_start: string | null };
export type AchievementRow = { id: string; child_id: string; title: string; earned_at: string };

export declare function listChildren(data: { family_id: string }): Promise<{
  children: ChildRow[];
  schedules: ScheduleRow[];
  homeworks: HomeworkRow[];
  achievements: AchievementRow[];
  reminders: ParentReminderRow[];
}>;
export declare function upsertChild(data: unknown): Promise<{ ok: boolean }>;
export declare function upsertHomework(data: unknown): Promise<{ ok: boolean }>;
export declare function upsertParentReminder(data: unknown): Promise<{ ok: boolean }>;
export declare function upsertSchedule(data: unknown): Promise<{ ok: boolean }>;
export declare function upsertAchievement(data: unknown): Promise<{ ok: boolean }>;
export declare function toggleHomework(data: { id: string; done: boolean }): Promise<{ ok: boolean }>;
export declare function toggleReminder(data: { id: string; done: boolean }): Promise<{ ok: boolean }>;
export declare function deleteChildrenRow(data: { table: string; id: string }): Promise<{ ok: boolean }>;
