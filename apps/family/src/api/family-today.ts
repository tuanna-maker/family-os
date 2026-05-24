import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type MemberKind = "elderly" | "child" | "adult";
export type StatusTone = "success" | "warning" | "info" | "muted" | "emergency";

export type FamilyTodayMember = {
  id: string;
  kind: MemberKind;
  name: string;
  avatar: string | null;
  role: string | null; // relation/grade/member_role
  status: string;
  tone: StatusTone;
  detail: string | null;
  due_at: string | null;
};

const Input = z.object({ family_id: z.string().uuid() });

export async function getFamilyToday(data: any) {
  const { supabase, userId } = await requireUser();

        const fid = data.family_id;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();
    const nowHHMM = now.toTimeString().slice(0, 5);

    const [elderly, kids, adults, meds, reminders, hws, appts] = await Promise.all([
      supabase
        .from("elderly_profiles")
        .select("id, name, avatar, relation, safe_status, safe_last_at, safe_note")
        .eq("family_id", fid)
        .order("created_at"),
      supabase
        .from("children")
        .select("id, name, avatar, grade")
        .eq("family_id", fid)
        .order("created_at"),
      supabase
        .from("family_members")
        .select("id, name, avatar, member_role")
        .eq("family_id", fid)
        .order("created_at"),
      supabase
        .from("medicine_reminders")
        .select("medicine, member_name, time_of_day")
        .eq("family_id", fid)
        .eq("active", true),
      supabase
        .from("parent_reminders")
        .select("title, remind_at, child_id, done")
        .eq("family_id", fid)
        .eq("done", false)
        .lte("remind_at", tomorrow)
        .order("remind_at", { ascending: true }),
      supabase
        .from("homeworks")
        .select("title, subject, due_date, child_id, done")
        .eq("family_id", fid)
        .eq("done", false)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("medical_appointments")
        .select("member_name, doctor, scheduled_at, status")
        .eq("family_id", fid)
        .neq("status", "cancelled")
        .gte("scheduled_at", now.toISOString())
        .lt("scheduled_at", tomorrow)
        .order("scheduled_at", { ascending: true }),
    ]);

    const elderlyList = elderly.data ?? [];
    const kidsList = kids.data ?? [];
    const adultList = adults.data ?? [];
    const medList = meds.data ?? [];
    const remList = reminders.data ?? [];
    const hwList = hws.data ?? [];
    const apptList = appts.data ?? [];

    const members: FamilyTodayMember[] = [];

    // ----- Elderly -----
    for (const e of elderlyList) {
      const med = medList.find((m) => m.member_name === e.name);
      const appt = apptList.find((a) => a.member_name === e.name);
      let status = "Bình thường";
      let tone: StatusTone = "success";
      let detail: string | null = e.safe_note ?? null;
      let due: string | null = null;

      if (e.safe_status === "alert") {
        status = "Cần chú ý";
        tone = "emergency";
      } else if (e.safe_status === "warn") {
        status = "Theo dõi";
        tone = "warning";
      } else if (appt) {
        status = "Khám hôm nay";
        tone = "info";
        detail = appt.doctor ? `BS ${appt.doctor}` : null;
        due = appt.scheduled_at;
      } else if (med) {
        status = "Có thuốc cần uống";
        tone = "warning";
        detail = `${med.medicine}${med.time_of_day ? ` · ${med.time_of_day}` : ""}`;
      } else if (e.safe_last_at) {
        const lastH = Math.round((now.getTime() - new Date(e.safe_last_at).getTime()) / 3600000);
        detail = lastH <= 0 ? "Vừa cập nhật" : `Cập nhật ${lastH}h trước`;
      }

      members.push({
        id: `elderly:${e.id}`,
        kind: "elderly",
        name: e.name,
        avatar: e.avatar,
        role: e.relation ?? "Ông/Bà",
        status,
        tone,
        detail,
        due_at: due,
      });
    }

    // ----- Children -----
    for (const c of kidsList) {
      const myRem = remList.filter((r) => r.child_id === c.id);
      const myHw = hwList.filter((h) => h.child_id === c.id);
      const overdue = myHw.filter((h) => h.due_date && h.due_date < todayStr);
      const dueToday = myHw.filter((h) => h.due_date === todayStr);

      let status = "Ổn định";
      let tone: StatusTone = "success";
      let detail: string | null = null;
      let due: string | null = null;

      if (overdue.length > 0) {
        status = `${overdue.length} bài quá hạn`;
        tone = "emergency";
        detail = overdue[0].title;
      } else if (myRem.length > 0) {
        status = `${myRem.length} lời nhắc`;
        tone = "warning";
        detail = myRem[0].title;
        due = myRem[0].remind_at;
      } else if (dueToday.length > 0) {
        status = `${dueToday.length} bài hôm nay`;
        tone = "info";
        detail = `${dueToday[0].subject} · ${dueToday[0].title}`;
      } else if (myHw.length > 0) {
        status = `${myHw.length} bài sắp tới`;
        tone = "info";
        detail = myHw[0].due_date ? `Hạn ${myHw[0].due_date}` : myHw[0].title;
      }

      members.push({
        id: `child:${c.id}`,
        kind: "child",
        name: c.name,
        avatar: c.avatar,
        role: c.grade ?? "Con",
        status,
        tone,
        detail,
        due_at: due,
      });
    }

    // ----- Adults -----
    for (const a of adultList) {
      const med = medList.find((m) => m.member_name === a.name);
      const appt = apptList.find((ap) => ap.member_name === a.name);
      let status = "Bình thường";
      let tone: StatusTone = "success";
      let detail: string | null = null;
      let due: string | null = null;

      if (appt) {
        status = "Khám hôm nay";
        tone = "info";
        detail = appt.doctor ? `BS ${appt.doctor}` : null;
        due = appt.scheduled_at;
      } else if (med) {
        const t = (med.time_of_day ?? "").slice(0, 5);
        const upcoming = t && t >= nowHHMM;
        status = upcoming ? "Sắp uống thuốc" : "Có thuốc cần uống";
        tone = "warning";
        detail = `${med.medicine}${t ? ` · ${t}` : ""}`;
      }

      members.push({
        id: `adult:${a.id}`,
        kind: "adult",
        name: a.name,
        avatar: a.avatar,
        role: a.member_role,
        status,
        tone,
        detail,
        due_at: due,
      });
    }

    return { members };
}
