import { getSupabase } from "@shared/supabase/get-client";
import Constants from "expo-constants";

const LOVABLE_AI_URL =
  "https://project--c8994243-7085-4f94-b9d2-64cf72759c44.lovable.app/api/ai-insight";

function readAnonKey() {
  const extra = Constants.expoConfig?.extra ?? {};
  return (
    (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
    (extra.supabaseAnonKey as string | undefined) ||
    ""
  );
}

async function callLovable(prompt: string) {
  const supabase = getSupabase();
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !sessionData.session?.access_token) {
    throw new Error("Chưa đăng nhập");
  }

  const anonKey = readAnonKey();
  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
      ...(anonKey ? { apikey: anonKey } : {}),
      "x-client-info": "mobile-family",
    },
    body: JSON.stringify({ prompt }),
  });
  const rawText = await res.text().catch(() => "");
  const body = (() => {
    try {
      return JSON.parse(rawText) as { ok?: boolean; text?: string; error?: string };
    } catch {
      return null;
    }
  })();
  if (!res.ok) throw new Error(body?.error ?? rawText.slice(0, 200) || `AI lỗi (${res.status})`);
  if (!body?.ok || !body.text) throw new Error(body?.error ?? "AI thất bại");
  return { text: body.text };
}

export async function aiInsight(data: { prompt: string }) {
  const prompt = (data.prompt ?? "").trim();
  if (!prompt) throw new Error("Thiếu prompt");
  // Prefer Lovable endpoint (Supabase function may be missing => 404).
  return await callLovable(prompt);
}

