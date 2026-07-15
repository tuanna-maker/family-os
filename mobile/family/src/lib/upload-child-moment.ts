import * as FileSystem from "expo-file-system/legacy";
import { getSupabase } from "@shared/supabase/get-client";

const BUCKET = "child-moments";
const MAX_BYTES = 10 * 1024 * 1024;
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
      return { bytes: base64ToUint8Array(base64), contentType };
    } catch {
      throw new Error("Không đọc được ảnh từ thiết bị");
    }
  }

  const response = await fetch(uri);
  if (!response.ok) throw new Error("Không tải được ảnh");
  const buffer = await response.arrayBuffer();
  return { bytes: new Uint8Array(buffer), contentType: response.headers.get("content-type") || contentType };
}

export async function uploadChildMomentFromUri(familyId: string, childId: string, uri: string) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { bytes, contentType } = await readImageBytes(uri);
  if (bytes.byteLength > MAX_BYTES) throw new Error("Ảnh quá lớn (>10MB)");

  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${user.id}/${familyId}/${childId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });
  if (error) throw new Error(error.message);
  const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (signErr || !signed?.signedUrl) throw new Error(signErr?.message ?? "Không tạo được link ảnh");
  return { publicUrl: signed.signedUrl };
}
