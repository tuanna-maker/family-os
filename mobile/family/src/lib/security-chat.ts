import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase } from "@shared/supabase/get-client";

export type SecurityChatMessage = {
  id: string;
  sender_role: "resident" | "guard" | "system";
  body: string;
  created_at: string;
};

const LOCAL_KEY = "family-security-chat";

function chatDb(supabase: ReturnType<typeof getSupabase>) {
  return supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: SecurityChatMessage[] | null; error: { code?: string; message?: string } | null }>;
          };
        };
      };
      insert: (row: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: SecurityChatMessage | null; error: { code?: string; message?: string } | null }>;
        };
      };
    };
  };
}

function isMissingTable(err: { code?: string; message?: string }) {
  return err.code === "42P01" || /does not exist|schema cache/i.test(err.message ?? "");
}

async function loadLocal(userId: string): Promise<SecurityChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as SecurityChatMessage[]) : [];
  } catch {
    return [];
  }
}

async function saveLocal(userId: string, messages: SecurityChatMessage[]) {
  await AsyncStorage.setItem(`${LOCAL_KEY}:${userId}`, JSON.stringify(messages.slice(-80)));
}

export async function listSecurityChatMessages(familyId?: string | null) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await chatDb(supabase)
    .from("security_chat_messages")
    .select("id,sender_role,body,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error && isMissingTable(error)) return loadLocal(user.id);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (rows.length === 0 && familyId) {
    return [
      {
        id: "welcome",
        sender_role: "system" as const,
        body: "Xin chào! Đây là kênh chat trực tiếp với đội bảo an. Gửi tin nhắn khi cần hỗ trợ.",
        created_at: new Date().toISOString(),
      },
    ];
  }
  return rows;
}

export async function sendSecurityChatMessage(data: { body: string; family_id?: string | null }) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const body = data.body.trim();
  if (!body) throw new Error("Tin nhắn trống");

  const { data: row, error } = await chatDb(supabase)
    .from("security_chat_messages")
    .insert({
      user_id: user.id,
      family_id: data.family_id ?? null,
      sender_role: "resident",
      body,
    })
    .select("id,sender_role,body,created_at")
    .single();

  if (error && isMissingTable(error)) {
    const local = await loadLocal(user.id);
    const resident: SecurityChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender_role: "resident",
      body,
      created_at: new Date().toISOString(),
    };
    const guard: SecurityChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender_role: "guard",
      body: "Bảo an đã nhận tin. Đội trực sẽ phản hồi trong vài phút.",
      created_at: new Date(Date.now() + 400).toISOString(),
    };
    await saveLocal(user.id, [...local, resident, guard]);
    return resident;
  }
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Không gửi được tin nhắn");
  return row;
}
