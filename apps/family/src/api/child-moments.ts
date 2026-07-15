import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type ChildMoment = {
  id: string;
  family_id: string;
  child_id: string;
  album_id: string | null;
  title: string;
  caption: string | null;
  media_url: string;
  thumbnail_url: string | null;
  taken_at: string;
  created_at: string;
};

export async function listChildMoments(data: {
  family_id: string;
  child_id?: string;
  album_id?: string;
  limit?: number;
}) {
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      child_id: z.string().uuid().optional(),
      album_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    })
    .parse(data);

  const { supabase } = await requireUser();
  let q: any = (supabase as any)
    .from("child_moments")
    .select("id,family_id,child_id,album_id,title,caption,media_url,thumbnail_url,taken_at,created_at")
    .eq("family_id", parsed.family_id)
    .order("taken_at", { ascending: false })
    .limit(parsed.limit ?? 60);

  if (parsed.child_id) q = q.eq("child_id", parsed.child_id);
  if (parsed.album_id) q = q.eq("album_id", parsed.album_id);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return { moments: (rows as any ?? []) as ChildMoment[] };
}

export async function createChildMoment(data: {
  family_id: string;
  child_id: string;
  album_id: string;
  title?: string;
  caption?: string;
  media_url: string;
  thumbnail_url?: string;
  taken_at?: string;
}) {
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      child_id: z.string().uuid(),
      album_id: z.string().uuid(),
      title: z.string().max(200).optional(),
      caption: z.string().max(500).optional(),
      media_url: z.string().url().max(2000),
      thumbnail_url: z.string().url().max(2000).optional(),
      taken_at: z.string().datetime().optional(),
    })
    .parse(data);

  const { supabase, userId } = await requireUser();
  const { data: row, error } = await (supabase as any)
    .from("child_moments")
    .insert({
      family_id: parsed.family_id,
      child_id: parsed.child_id,
      album_id: parsed.album_id,
      title: parsed.title?.trim() || parsed.caption?.trim() || "Khoảnh khắc",
      caption: parsed.caption?.trim() || null,
      media_url: parsed.media_url,
      thumbnail_url: parsed.thumbnail_url ?? null,
      taken_at: parsed.taken_at ?? new Date().toISOString(),
      created_by: userId,
    })
    .select("id,family_id,child_id,album_id,title,caption,media_url,thumbnail_url,taken_at,created_at")
    .single();

  if (error) throw new Error(error.message);

  const coverUrl = parsed.thumbnail_url ?? parsed.media_url;
  await (supabase as any).from("child_albums").update({ cover_url: coverUrl }).eq("id", parsed.album_id);

  return row as any as ChildMoment;
}

export async function deleteChildMoment(data: { id: string }) {
  const { supabase } = await requireUser();
  const { error } = await (supabase as any).from("child_moments").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
