import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_TTL = 60 * 60 * 24 * 365;

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function readImageBytes(uri: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const ext = uri.toLowerCase().includes(".png") ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";

  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    const FileSystem = await import("expo-file-system/legacy");
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) throw new Error("Không đọc được ảnh từ thiết bị");
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { bytes: base64ToUint8Array(base64), contentType };
  }

  const response = await fetch(uri);
  if (!response.ok) throw new Error("Không tải được ảnh");
  const buffer = await response.arrayBuffer();
  return { bytes: new Uint8Array(buffer), contentType: response.headers.get("content-type") || contentType };
}

export async function uploadAvatarFromUri(uri: string, pathPrefix: string) {
  const { supabase, userId } = await requireUser();
  const { bytes, contentType } = await readImageBytes(uri);
  if (bytes.byteLength > MAX_BYTES) throw new Error("Ảnh tối đa 5MB");

  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${userId}/${pathPrefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    cacheControl: "3600",
    upsert: true,
    contentType,
  });
  if (error) throw new Error(error.message);

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  if (signErr || !signed?.signedUrl) throw new Error(signErr?.message ?? "Không tạo được link ảnh");
  return signed.signedUrl;
}

export async function updateProfileAvatar(data: { avatar_url: string }) {
  const { supabase, userId } = await requireUser();
  const parsed = z.object({ avatar_url: z.string().url().max(4096) }).parse(data);
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.avatar_url })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true as const, avatar_url: parsed.avatar_url };
}
