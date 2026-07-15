import { getSupabase } from "./get-client";

export const SECURITY_CHAT_BUCKET = "security-chat";
const SIGNED_TTL = 60 * 60 * 24 * 365;

export type SecurityChatMessageType = "text" | "image" | "audio" | "emoji";

/** Upload bytes trực tiếp — tránh Blob trên React Native. */
export async function uploadSecurityChatBytes(
  fileBytes: ArrayBuffer | Uint8Array,
  opts: { userId: string; mimeType: string; ext: string },
): Promise<string> {
  const supabase = getSupabase();
  const path = `${opts.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${opts.ext}`;
  const { error } = await supabase.storage.from(SECURITY_CHAT_BUCKET).upload(path, fileBytes, {
    contentType: opts.mimeType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data, error: signErr } = await supabase.storage
    .from(SECURITY_CHAT_BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  if (signErr || !data?.signedUrl) throw new Error(signErr?.message ?? "Không tạo được link file");
  return data.signedUrl;
}
