import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type UserProfileDetails = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  username: string | null;
  apartment_no: string | null;
  building_name: string | null;
  avatar_url: string | null;
};

const updateSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => v || null),
  username: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => {
      if (!v) return null;
      const normalized = v.normalize("NFKC").replace(/[\s\u200B-\u200D\uFEFF]+/g, "").toLowerCase();
      if (!/^[a-z0-9_.]{3,30}$/.test(normalized)) {
        throw new Error("Tên đăng nhập: 3–30 ký tự, chỉ chữ thường, số, _ và .");
      }
      return normalized;
    }),
});

export async function getUserProfileDetails(): Promise<UserProfileDetails> {
  const { supabase, userId, user } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, username, apartment_no, building_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    id: userId,
    full_name: (data?.full_name as string | null) ?? null,
    phone: (data?.phone as string | null) ?? null,
    email: (data?.email as string | null) ?? user.email ?? null,
    username: (data?.username as string | null) ?? null,
    apartment_no: (data?.apartment_no as string | null) ?? null,
    building_name: (data?.building_name as string | null) ?? null,
    avatar_url: (data?.avatar_url as string | null) ?? null,
  };
}

export async function updateUserProfile(input: z.infer<typeof updateSchema>) {
  const { supabase, userId } = await requireUser();
  const parsed = updateSchema.parse(input);

  if (parsed.username) {
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", parsed.username)
      .neq("id", userId)
      .maybeSingle();
    if (taken) throw new Error("Tên đăng nhập đã được sử dụng");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.full_name,
      phone: parsed.phone,
      username: parsed.username,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
