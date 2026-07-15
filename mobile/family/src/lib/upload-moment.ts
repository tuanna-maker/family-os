import { getSupabase } from "@shared/supabase/get-client";

const BUCKET = "family-moments";
const SIGNED_TTL = 60 * 60 * 24 * 365;

export async function uploadMomentFromUri(familyId: string, uri: string) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const response = await fetch(uri);
  const blob = await response.blob();
  if (blob.size > 10 * 1024 * 1024) throw new Error("Ảnh quá lớn (>10MB)");

  const ext = uri.toLowerCase().includes(".png") ? "png" : "jpg";
  const path = `${user.id}/${familyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);
  const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (signErr || !signed?.signedUrl) throw new Error(signErr?.message ?? "Không tạo được link ảnh");
  return { publicUrl: signed.signedUrl };
}
