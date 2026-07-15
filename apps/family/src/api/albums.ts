import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type FamilyAlbum = {
  id: string;
  family_id: string;
  title: string;
  category: string | null;
  cover_emoji: string;
  created_by: string;
  created_at: string;
  moment_count?: number;
};

export async function listAlbums(data: { family_id: string }) {
  const { supabase } = await requireUser();
  const { family_id } = z.object({ family_id: z.string().uuid() }).parse(data);
  const { data: rows, error } = await (supabase as any)
    .from("family_albums")
    .select("id,family_id,title,category,cover_emoji,created_by,created_at")
    .eq("family_id", family_id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const albums = (rows as any ?? []) as FamilyAlbum[];
  if (albums.length === 0) return { albums: [] as FamilyAlbum[] };
  const ids = albums.map((a) => a.id);
  const { data: counts, error: cErr } = await (supabase as any)
    .from("family_moments")
    .select("album_id")
    .in("album_id", ids);
  if (cErr) throw new Error(cErr.message);
  const countMap = new Map<string, number>();
  for (const r of counts ?? []) {
    const aid = r.album_id as string;
    if (aid) countMap.set(aid, (countMap.get(aid) ?? 0) + 1);
  }
  return {
    albums: albums.map((a) => ({ ...a, moment_count: countMap.get(a.id) ?? 0 })),
  };
}

export async function createAlbum(data: {
  family_id: string;
  title: string;
  category?: string;
  cover_emoji?: string;
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      title: z.string().min(1).max(120),
      category: z.string().max(80).optional(),
      cover_emoji: z.string().max(8).optional(),
    })
    .parse(data);
  const { data: row, error } = await (supabase as any)
    .from("family_albums")
    .insert({
      family_id: parsed.family_id,
      title: parsed.title,
      category: parsed.category ?? null,
      cover_emoji: parsed.cover_emoji ?? "📁",
      created_by: userId,
    })
    .select("id,family_id,title,category,cover_emoji,created_by,created_at")
    .single();
  if (error) throw new Error(error.message);
  return { album: row as any as FamilyAlbum };
}

export async function getAlbum(data: { album_id: string; family_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({ album_id: z.string().uuid(), family_id: z.string().uuid() })
    .parse(data);
  const { data: album, error } = await (supabase as any)
    .from("family_albums")
    .select("id,family_id,title,category,cover_emoji,created_by,created_at")
    .eq("id", parsed.album_id)
    .eq("family_id", parsed.family_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!album) throw new Error("Không tìm thấy album");
  const { data: moments, error: mErr } = await (supabase as any)
    .from("family_moments")
    .select("id,caption,media_url,thumbnail_url,media_type,taken_at,created_at")
    .eq("album_id", parsed.album_id)
    .order("taken_at", { ascending: false });
  if (mErr) throw new Error(mErr.message);
  return { album: album as any as FamilyAlbum, moments: (moments ?? []) as any[] };
}

export async function updateAlbum(data: {
  id: string;
  family_id: string;
  title: string;
  category?: string;
  cover_emoji?: string;
}) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({
      id: z.string().uuid(),
      family_id: z.string().uuid(),
      title: z.string().min(1).max(120),
      category: z.string().max(80).optional(),
      cover_emoji: z.string().max(8).optional(),
    })
    .parse(data);
  const { error } = await (supabase as any)
    .from("family_albums")
    .update({
      title: parsed.title,
      category: parsed.category ?? null,
      cover_emoji: parsed.cover_emoji ?? "📁",
    })
    .eq("id", parsed.id)
    .eq("family_id", parsed.family_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteAlbum(data: { id: string; family_id: string }) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({ id: z.string().uuid(), family_id: z.string().uuid() })
    .parse(data);
  const { error } = await (supabase as any)
    .from("family_albums")
    .delete()
    .eq("id", parsed.id)
    .eq("family_id", parsed.family_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
