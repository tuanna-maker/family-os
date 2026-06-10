import { requireUser } from "@shared/supabase/auth";

export type PlatformNotification = {
  id: string;
  topic: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  status: string;
  read_at: string | null;
  created_at: string;
};

export async function listPlatformNotifications() {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .schema("platform")
    .from("notification")
    .select("id, topic, title, body, data, status, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as PlatformNotification[];
}

export async function unreadPlatformCount() {
  const { supabase, userId } = await requireUser();
  const { count, error } = await supabase
    .schema("platform")
    .from("notification")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
    .in("status", ["queued", "sent", "delivered"]);
  if (error) throw new Error(error.message);
  return { count: count ?? 0 };
}

export async function markPlatformRead(data: { id: string }) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .schema("platform")
    .from("notification")
    .update({ read_at: new Date().toISOString(), status: "read" })
    .eq("id", data.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function markAllPlatformRead() {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .schema("platform")
    .from("notification")
    .update({ read_at: new Date().toISOString(), status: "read" })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Xóa thông báo platform đã đọc (giữ lại chưa đọc). */
export async function deleteReadPlatformNotifications() {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .schema("platform")
    .from("notification")
    .delete()
    .eq("user_id", userId)
    .not("read_at", "is", null);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function deletePlatformNotifications(ids: string[]) {
  if (ids.length === 0) return { ok: true as const };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .schema("platform")
    .from("notification")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
