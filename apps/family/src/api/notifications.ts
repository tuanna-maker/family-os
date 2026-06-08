import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type NotificationRow = {
  id: string;
  type: string;
  ref_id: string | null;
  title: string;
  body: string | null;
  due_at: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listNotifications(data: any) {
  const { supabase, userId } = await requireUser();
    const limit = data.limit ?? 20;
    const offset = data.offset ?? 0;
    let q = supabase
      .from("notifications")
      .select("id, type, ref_id, title, body, due_at, read_at, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (data.only_unread) q = q.is("read_at", null);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as NotificationRow[], total: count ?? 0, limit, offset };
}

export async function unreadCount() {
  const { supabase, userId } = await requireUser();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
}

export async function markRead(data: any) {
  const { supabase, userId } = await requireUser();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
}

export async function markAllRead() {
  const { supabase, userId } = await requireUser();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
}

/** Xóa các thông báo đã đọc (giữ lại chưa đọc). */
export async function deleteReadNotifications() {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .not("read_at", "is", null);
  if (error) throw new Error(error.message);
  return { ok: true };
}
