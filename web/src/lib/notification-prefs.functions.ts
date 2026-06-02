import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationPrefs = {
  user_id: string;
  medicine_enabled: boolean;
  parent_reminder_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
};

const DEFAULTS: Omit<NotificationPrefs, "user_id"> = {
  medicine_enabled: true,
  parent_reminder_enabled: true,
  quiet_start: "07:00",
  quiet_end: "22:00",
};

export const getMyPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPrefs> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { user_id: userId, ...DEFAULTS };
  });

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Định dạng HH:MM");

export const updateMyPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      medicine_enabled: z.boolean(),
      parent_reminder_enabled: z.boolean(),
      quiet_start: hhmm,
      quiet_end: hhmm,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** List preferences for all members of caller's family (owner sees everyone). */
export const listFamilyPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Find caller's family (as owner first, else first membership)
    const { data: owned } = await supabase
      .from("families")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    let familyId = owned?.id as string | undefined;
    if (!familyId) {
      const { data: ur } = await supabase
        .from("user_roles")
        .select("family_id")
        .eq("user_id", userId)
        .not("family_id", "is", null)
        .limit(1)
        .maybeSingle();
      familyId = ur?.family_id ?? undefined;
    }
    if (!familyId) return { members: [] as Array<{ user_id: string; name: string | null; prefs: NotificationPrefs }> };

    // Collect member user_ids: owner + user_roles for that family
    const { data: fam } = await supabase.from("families").select("owner_id").eq("id", familyId).maybeSingle();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("family_id", familyId)
      .in("role", ["family_owner", "family_member"]);
    const ids = Array.from(new Set([fam?.owner_id, ...(roles ?? []).map((r) => r.user_id)].filter(Boolean) as string[]));
    if (ids.length === 0) return { members: [] };

    const [{ data: profiles }, { data: prefs }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", ids),
      supabase.from("notification_preferences").select("*").in("user_id", ids),
    ]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const prefMap = new Map((prefs ?? []).map((p) => [p.user_id, p]));

    return {
      members: ids.map((uid) => ({
        user_id: uid,
        name: profileMap.get(uid) ?? null,
        prefs: (prefMap.get(uid) as NotificationPrefs) ?? { user_id: uid, ...DEFAULTS },
      })),
    };
  });
