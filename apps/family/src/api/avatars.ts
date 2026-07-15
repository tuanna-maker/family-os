import * as FileSystem from "expo-file-system/legacy";
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
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = base64ToUint8Array(base64);
      return { bytes, contentType };
    } catch {
      throw new Error("Không đọc được ảnh từ thiết bị");
    }
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

  const { data: ownedFamily } = await supabase
    .from("families")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (ownedFamily?.id) {
    const { error: familyErr } = await (supabase as any)
      .from("families")
      .update({ avatar_url: parsed.avatar_url })
      .eq("id", ownedFamily.id);
    if (familyErr) throw new Error(familyErr.message);
  }

  return { ok: true as const, avatar_url: parsed.avatar_url };
}

export async function updateFamilyAvatar(data: { family_id: string; avatar_url: string }) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      avatar_url: z.string().url().max(4096),
    })
    .parse(data);

  const { data: fam, error: famErr } = await supabase
    .from("families")
    .select("id, owner_id")
    .eq("id", parsed.family_id)
    .maybeSingle();
  if (famErr) throw new Error(famErr.message);
  if (!fam || fam.owner_id !== userId) {
    throw new Error("Chỉ chủ hộ được đổi ảnh gia đình");
  }

  const { error } = await (supabase as { from: (t: string) => ReturnType<typeof supabase.from> })
    .from("families")
    .update({ avatar_url: parsed.avatar_url })
    .eq("id", parsed.family_id);
  if (error) throw new Error(error.message);

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.avatar_url })
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);

  return { ok: true as const, avatar_url: parsed.avatar_url };
}
