import { Platform } from "react-native";
import { requireUser } from "@shared/supabase/auth";
import { getSupabase } from "@shared/supabase/get-client";
import { getMyPrefs } from "@mobile/api/notification-prefs";

const PREFIX = "stos-local-";

function parseHHMM(raw: string | null | undefined) {
  const m = /^(\d{2}):(\d{2})/.exec(raw ?? "");
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

function inQuietWindow(hhmm: string, start: string, end: string) {
  return hhmm >= start && hhmm <= end;
}

async function resolveFamilyId(userId: string) {
  const supabase = getSupabase();
  const { data: owned } = await supabase.from("families").select("id").eq("owner_id", userId).maybeSingle();
  if (owned?.id) return owned.id as string;
  const { data: ur } = await supabase
    .from("user_roles")
    .select("family_id")
    .eq("user_id", userId)
    .not("family_id", "is", null)
    .limit(1)
    .maybeSingle();
  return (ur?.family_id as string | undefined) ?? null;
}

async function cancelLocalSchedules() {
  const Notifications = await import("expo-notifications");
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Lên lịch thông báo native trên máy (AlarmManager / iOS) — hoạt động khi app tắt, không cần server push.
 */
export async function syncLocalReminderSchedule(pushEnabled: boolean) {
  await cancelLocalSchedules();
  if (!pushEnabled) return;

  const Notifications = await import("expo-notifications");
  const granted = (await Notifications.getPermissionsAsync()).status === "granted";
  if (granted !== true) return;

  const prefs = await getMyPrefs();
  const { userId } = await requireUser();
  const familyId = await resolveFamilyId(userId);
  if (!familyId) return;

  const supabase = getSupabase();
  const now = Date.now();

  if (prefs.medicine_enabled) {
    const { data: meds } = await supabase
      .from("medicine_reminders")
      .select("id, medicine, member_name, dosage, time_of_day, active")
      .eq("family_id", familyId)
      .eq("active", true);

    for (const m of meds ?? []) {
      const t = parseHHMM(m.time_of_day);
      if (!t) continue;
      const hhmm = `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
      if (!inQuietWindow(hhmm, prefs.quiet_start, prefs.quiet_end)) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}med-${m.id}`,
        content: {
          title: `Đến giờ uống thuốc: ${m.medicine}`,
          body: `${m.member_name}${m.dosage ? ` · ${m.dosage}` : ""}${m.time_of_day ? ` · ${hhmm}` : ""}`,
          sound: true,
          ...(Platform.OS === "android" ? { channelId: "default" } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: t.hour,
          minute: t.minute,
        },
      });
    }
  }

  if (prefs.parent_reminder_enabled) {
    const { data: prs } = await supabase
      .from("parent_reminders")
      .select("id, title, notes, remind_at, done")
      .eq("family_id", familyId)
      .eq("done", false);

    for (const r of prs ?? []) {
      const at = new Date(r.remind_at).getTime();
      if (!Number.isFinite(at) || at <= now) continue;
      const remindHHMM = new Date(r.remind_at).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
      });
      if (!inQuietWindow(remindHHMM, prefs.quiet_start, prefs.quiet_end)) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}pr-${r.id}`,
        content: {
          title: `Nhắc việc của con: ${r.title}`,
          body: r.notes ?? "",
          sound: true,
          ...(Platform.OS === "android" ? { channelId: "default" } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(r.remind_at),
        },
      });
    }
  }
}
