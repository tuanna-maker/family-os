import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type SecurityChatMessage = {
  id: string;
  sender_role: "resident" | "guard" | "system";
  body: string;
  created_at: string;
};

const LOCAL_KEY = "family-security-chat";

function loadLocal(userId: string): SecurityChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as SecurityChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(userId: string, messages: SecurityChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LOCAL_KEY}:${userId}`, JSON.stringify(messages.slice(-80)));
}

function isMissingTable(err: { code?: string; message?: string }) {
  return err.code === "42P01" || /does not exist|schema cache/i.test(err.message ?? "");
}

export async function listSecurityChatMessages(familyId?: string | null) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("security_chat_messages")
    .select("id,sender_role,body,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error && isMissingTable(error)) return loadLocal(userId);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SecurityChatMessage[];
  if (rows.length === 0 && familyId) {
    const welcome: SecurityChatMessage = {
      id: "welcome",
      sender_role: "system",
      body: "Xin chào! Đây là kênh chat trực tiếp với đội bảo an. Gửi tin nhắn khi cần hỗ trợ.",
      created_at: new Date().toISOString(),
    };
    return [welcome];
  }
  return rows;
}

export async function sendSecurityChatMessage(data: { body: string; family_id?: string | null }) {
  const { supabase, userId } = await requireUser();
  const parsed = z.object({ body: z.string().min(1).max(2000), family_id: z.string().uuid().nullable().optional() }).parse(data);
  const { data: row, error } = await supabase
    .from("security_chat_messages")
    .insert({
      user_id: userId,
      family_id: parsed.family_id ?? null,
      sender_role: "resident",
      body: parsed.body.trim(),
    })
    .select("id,sender_role,body,created_at")
    .single();
  if (error && isMissingTable(error)) {
    const local = loadLocal(userId);
    const resident: SecurityChatMessage = {
      id: crypto.randomUUID(),
      sender_role: "resident",
      body: parsed.body.trim(),
      created_at: new Date().toISOString(),
    };
    saveLocal(userId, [...local, resident]);
    return resident;
  }
  if (error) throw new Error(error.message);
  return row as SecurityChatMessage;
}
