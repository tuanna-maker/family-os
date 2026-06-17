import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

const InputSchema = z.object({
  prompt: z.string().min(1).max(16_000),
});

export async function aiInsight(input: z.infer<typeof InputSchema>): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const data = InputSchema.parse(input);
  const { supabase } = await requireUser();
  const { data: payload, error } = await supabase.functions.invoke("ai-insight", { body: { prompt: data.prompt } });
  if (error) return { ok: false, error: error.message };
  const body = payload as { ok?: boolean; text?: string; error?: string };
  if (!body?.ok || !body.text) return { ok: false, error: body?.error ?? "AI thất bại" };
  return { ok: true, text: body.text };
}

