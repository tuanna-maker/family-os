import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type Moment = {
  id: string;
  family_id: string;
  created_by: string;
  album_id: string | null;
  caption: string | null;
  media_url: string;
  media_type: "image" | "video";
  thumbnail_url: string | null;
  taken_at: string;
  tagged_member_ids: string[];
  created_at: string;
};

export type MomentProfile = { id: string; full_name: string | null };

export type MomentReaction = {
  id: string;
  moment_id: string;
  user_id: string;
  emoji: string;
};

export type MomentComment = {
  id: string;
  moment_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

const BUCKET = "family-moments";

export async function listMoments(data: { family_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z.object({ family_id: z.string().uuid() }).parse(data);
  const { data: moments, error } = await supabase
    .from("family_moments")
    .select(
      "id,family_id,created_by,album_id,caption,media_url,media_type,thumbnail_url,taken_at,tagged_member_ids,created_at",
    )
    .eq("family_id", parsed.family_id)
    .order("taken_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const ids = (moments ?? []).map((m) => m.id);
  if (ids.length === 0) {
    return { moments: [] as Moment[], reactions: [] as MomentReaction[], comments: [] as MomentComment[] };
  }
  const [reacs, coms] = await Promise.all([
    supabase.from("moment_reactions").select("id,moment_id,user_id,emoji").in("moment_id", ids),
    supabase
      .from("moment_comments")
      .select("id,moment_id,user_id,body,created_at")
      .in("moment_id", ids)
      .order("created_at"),
  ]);
  if (reacs.error) throw new Error(reacs.error.message);
  if (coms.error) throw new Error(coms.error.message);
  return {
    moments: (moments ?? []).map((m) => ({
      ...m,
      tagged_member_ids: (m.tagged_member_ids as string[]) ?? [],
    })) as Moment[],
    reactions: (reacs.data ?? []) as MomentReaction[],
    comments: (coms.data ?? []) as MomentComment[],
  };
}

export async function uploadMomentFile(input: { family_id: string; file: File }) {
  const { supabase, userId } = await requireUser();
  const { family_id, file } = z
    .object({ family_id: z.string().uuid(), file: z.instanceof(File) })
    .parse(input);
  if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh quá lớn (>10MB)");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${family_id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: urlData.publicUrl };
}

export async function getMoment(data: { moment_id: string; family_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({ moment_id: z.string().uuid(), family_id: z.string().uuid() })
    .parse(data);
  const { data: moment, error } = await supabase
    .from("family_moments")
    .select(
      "id,family_id,created_by,album_id,caption,media_url,media_type,thumbnail_url,taken_at,tagged_member_ids,created_at",
    )
    .eq("id", parsed.moment_id)
    .eq("family_id", parsed.family_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!moment) throw new Error("Không tìm thấy kỷ niệm");
  const [reacs, coms] = await Promise.all([
    supabase
      .from("moment_reactions")
      .select("id,moment_id,user_id,emoji")
      .eq("moment_id", parsed.moment_id),
    supabase
      .from("moment_comments")
      .select("id,moment_id,user_id,body,created_at")
      .eq("moment_id", parsed.moment_id)
      .order("created_at"),
  ]);
  if (reacs.error) throw new Error(reacs.error.message);
  if (coms.error) throw new Error(coms.error.message);
  const reactions = (reacs.data ?? []) as MomentReaction[];
  const comments = (coms.data ?? []) as MomentComment[];
  const userIds = [
    ...new Set([
      moment.created_by as string,
      ...reactions.map((r) => r.user_id),
      ...comments.map((c) => c.user_id),
    ]),
  ];
  const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null]));
  return {
    moment: {
      ...moment,
      tagged_member_ids: (moment.tagged_member_ids as string[]) ?? [],
      album_id: (moment.album_id as string | null) ?? null,
    } as Moment,
    reactions,
    comments,
    profiles: userIds.map((id) => ({
      id,
      full_name: profileMap.get(id) ?? null,
    })) as MomentProfile[],
  };
}

export async function createMoment(data: {
  family_id: string;
  media_url: string;
  media_type?: "image" | "video";
  caption?: string;
  taken_at?: string;
  album_id?: string;
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      media_url: z.string().url().max(1024),
      media_type: z.enum(["image", "video"]).default("image"),
      caption: z.string().max(500).optional(),
      taken_at: z.string().optional(),
      album_id: z.string().uuid().optional(),
    })
    .parse(data);
  const { data: row, error } = await supabase
    .from("family_moments")
    .insert({
      family_id: parsed.family_id,
      created_by: userId,
      media_url: parsed.media_url,
      media_type: parsed.media_type,
      caption: parsed.caption ?? null,
      album_id: parsed.album_id ?? null,
      taken_at: parsed.taken_at ?? new Date().toISOString(),
      tagged_member_ids: [],
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { moment: row as Moment };
}

export async function deleteMoment(data: { id: string }) {
  const { supabase } = await requireUser();
  const { id } = z.object({ id: z.string().uuid() }).parse(data);
  const { error } = await supabase.from("family_moments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function toggleReaction(data: {
  moment_id: string;
  family_id: string;
  emoji: string;
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      moment_id: z.string().uuid(),
      family_id: z.string().uuid(),
      emoji: z.string().min(1).max(8),
    })
    .parse(data);
  const { data: existing } = await supabase
    .from("moment_reactions")
    .select("id")
    .eq("moment_id", parsed.moment_id)
    .eq("user_id", userId)
    .eq("emoji", parsed.emoji)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("moment_reactions").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { added: false };
  }
  const { error } = await supabase.from("moment_reactions").insert({
    moment_id: parsed.moment_id,
    family_id: parsed.family_id,
    user_id: userId,
    emoji: parsed.emoji,
  });
  if (error) throw new Error(error.message);
  return { added: true };
}

export async function addMomentComment(data: {
  moment_id: string;
  family_id: string;
  body: string;
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      moment_id: z.string().uuid(),
      family_id: z.string().uuid(),
      body: z.string().min(1).max(500),
    })
    .parse(data);
  const { data: row, error } = await supabase
    .from("moment_comments")
    .insert({
      moment_id: parsed.moment_id,
      family_id: parsed.family_id,
      user_id: userId,
      body: parsed.body,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { comment: row as MomentComment };
}
