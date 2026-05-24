import { z } from "zod";
import { sha256 } from "js-sha256";
import { supabase } from "@shared/supabase/client";

export function normalizeUsername(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.normalize("NFKC").replace(/[\s\u200B-\u200D\uFEFF]+/g, "").toLowerCase();
}

const usernameSchema = z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/);

export const RESOLVE_MIN_RESPONSE_MS = 250;

export async function resolveLoginEmail(username: string): Promise<{ email: string | null }> {
  const started = Date.now();
  const normalized = normalizeUsername(username);
  const valid = usernameSchema.safeParse(normalized);
  let email: string | null = null;
  if (valid.success) {
    const { data, error } = await supabase.rpc("resolve_login_email", { _username: valid.data });
    if (!error) email = (data as string | null) ?? null;
  }
  const elapsed = Date.now() - started;
  if (elapsed < RESOLVE_MIN_RESPONSE_MS) {
    await new Promise((r) => setTimeout(r, RESOLVE_MIN_RESPONSE_MS - elapsed));
  }
  return { email };
}

export async function checkUsernameAvailable(username: string) {
  const normalized = normalizeUsername(username);
  const valid = usernameSchema.safeParse(normalized);
  if (!valid.success) return { available: false };
  const { data: row } = await supabase.from("profiles").select("id").eq("username", valid.data).maybeSingle();
  return { available: !row };
}

export function hashUsername(s: string): string {
  if (!s) return "";
  return sha256(s).slice(0, 12);
}
