import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";
import { fireChatPushDispatch } from "@shared/supabase";
import type { SecurityChatMessageType } from "@shared/supabase";

export type SecurityChatMessage = {
  id: string;
  user_id: string;
  sender_role: "resident" | "guard" | "system";
  sender_id: string | null;
  body: string;
  message_type?: SecurityChatMessageType;
  media_url?: string | null;
  media_duration_ms?: number | null;
  created_at: string;
};

export type GuardChatThread = {
  resident_user_id: string;
  resident_name: string;
  resident_avatar_url?: string | null;
  unit_label: string;
  family_id: string | null;
  last_body: string;
  last_sender_role: string;
  last_at: string;
  unread_count: number;
};

export type ResidentChatProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

const MSG_COLS =
  "id,user_id,sender_role,sender_id,body,message_type,media_url,media_duration_ms,created_at";

const LEGACY_AUTO_REPLY =
  /Bảo an đã nhận tin\. Đội trực sẽ phản hồi|Security received your message\. The on-duty team/i;

function isLegacyAutoReply(m: Pick<SecurityChatMessage, "sender_role" | "body">) {
  return m.sender_role === "guard" && LEGACY_AUTO_REPLY.test(m.body ?? "");
}

function filterLegacyAutoReplies(messages: SecurityChatMessage[]) {
  return messages.filter((m) => !isLegacyAutoReply(m));
}

function sanitizeThreadPreview(thread: GuardChatThread): GuardChatThread {
  if (
    thread.last_sender_role === "guard" &&
    LEGACY_AUTO_REPLY.test(thread.last_body ?? "")
  ) {
    return { ...thread, last_body: "", last_sender_role: "resident" };
  }
  return thread;
}

const sendSchema = z.object({
  resident_user_id: z.string().uuid(),
  body: z.string().max(2000).optional(),
  message_type: z.enum(["text", "image", "audio", "emoji"]).optional(),
  media_url: z.string().url().nullable().optional(),
  media_duration_ms: z.number().int().positive().nullable().optional(),
});

export async function listGuardChatThreads() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_guard_security_chat_inbox");
  if (error) throw new Error(error.message);
  return ((data ?? []) as GuardChatThread[]).map(sanitizeThreadPreview);
}

export async function getResidentChatProfile(residentUserId: string) {
  const parsed = z.string().uuid().parse(residentUserId);
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", parsed)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? { full_name: null, avatar_url: null }) as ResidentChatProfile;
}

export async function listResidentChatMessages(residentUserId: string) {
  const parsed = z.string().uuid().parse(residentUserId);
  const { supabase } = await requireUser();

  let { data, error } = await supabase
    .from("security_chat_messages")
    .select(MSG_COLS)
    .eq("user_id", parsed)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error && /column.*does not exist|42703/i.test(error.message ?? "")) {
    const fallback = await supabase
      .from("security_chat_messages")
      .select("id,user_id,sender_role,sender_id,body,created_at")
      .eq("user_id", parsed)
      .order("created_at", { ascending: true })
      .limit(200);
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);
  return filterLegacyAutoReplies((data ?? []) as SecurityChatMessage[]);
}

export async function sendGuardChatMessage(data: z.infer<typeof sendSchema>) {
  const parsed = sendSchema.parse(data);
  const { supabase, userId } = await requireUser();

  const body = (parsed.body ?? "").trim();
  const messageType = parsed.message_type ?? "text";
  if (!body && !parsed.media_url) throw new Error("Tin nhắn trống");

  const { data: lastRow } = await supabase
    .from("security_chat_messages")
    .select("project_id,family_id")
    .eq("user_id", parsed.resident_user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let projectId = (lastRow as { project_id?: string | null } | null)?.project_id ?? null;
  const familyId = (lastRow as { family_id?: string | null } | null)?.family_id ?? null;

  if (!projectId) {
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("project_id")
      .eq("user_id", userId)
      .in("role", ["security_admin", "security_staff"])
      .not("project_id", "is", null)
      .limit(1)
      .maybeSingle();
    projectId = (roleRow as { project_id?: string | null } | null)?.project_id ?? null;
  }

  const insertRow = {
    user_id: parsed.resident_user_id,
    family_id: familyId,
    project_id: projectId,
    sender_role: "guard" as const,
    sender_id: userId,
    body: body || (messageType === "image" ? "Ảnh" : messageType === "audio" ? "Ghi âm" : ""),
    message_type: messageType,
    media_url: parsed.media_url ?? null,
    media_duration_ms: parsed.media_duration_ms ?? null,
  };

  let { data: row, error } = await supabase
    .from("security_chat_messages")
    .insert(insertRow)
    .select(MSG_COLS)
    .single();

  if (error && /column.*does not exist|42703/i.test(error.message ?? "")) {
    const fallback = await supabase
      .from("security_chat_messages")
      .insert({
        user_id: parsed.resident_user_id,
        family_id: familyId,
        project_id: projectId,
        sender_role: "guard",
        sender_id: userId,
        body: insertRow.body,
      })
      .select("id,user_id,sender_role,sender_id,body,created_at")
      .single();
    row = fallback.data as typeof row;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);
  const sent = row as SecurityChatMessage;
  fireChatPushDispatch(supabase, sent.id);
  return sent;
}

export async function markGuardChatRead(residentUserId: string) {
  const parsed = z.string().uuid().parse(residentUserId);
  const { supabase, userId } = await requireUser();
  const now = new Date().toISOString();
  const { error } = await supabase.from("security_chat_reads").upsert(
    { guard_id: userId, resident_user_id: parsed, last_read_at: now },
    { onConflict: "guard_id,resident_user_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export function countGuardChatUnread(threads: GuardChatThread[]) {
  return threads.reduce((sum, t) => sum + (t.unread_count ?? 0), 0);
}
