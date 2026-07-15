import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type ChildAlbum = {
  id: string;
  family_id: string;
  child_id: string;
  title: string;
  cover_url: string | null;
  created_by: string;
  created_at: string;
  moment_count?: number;
};

export async function listChildAlbums(data: {
  family_id: string;
  child_id: string;
}) {
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      child_id: z.string().uuid(),
    })
    .parse(data);

  const { supabase } = await requireUser();
  const { data: rows, error } = await (supabase as any)
    .from("child_albums")
    .select("id,family_id,child_id,title,cover_url,created_by,created_at")
    .eq("family_id", parsed.family_id)
    .eq("child_id", parsed.child_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("child_albums") && (msg.includes("schema cache") || msg.includes("does not exist"))) {
      throw new Error(
        "Chưa cài bảng album trên Supabase. Chạy migration 20260617150000_child_albums.sql trong SQL Editor.",
      );
    }
    throw new Error(msg);
  }
  const albums = (rows as any ?? []) as ChildAlbum[];
  if (albums.length === 0) return { albums: [] as ChildAlbum[] };

  const ids = albums.map((a) => a.id);
  const { data: counts, error: cErr } = await (supabase as any)
    .from("child_moments")
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

export async function createChildAlbum(data: {
  family_id: string;
  child_id: string;
  title: string;
}) {
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      child_id: z.string().uuid(),
      title: z.string().min(1).max(120),
    })
    .parse(data);

  const { supabase, userId } = await requireUser();
  const { data: row, error } = await (supabase as any)
    .from("child_albums")
    .insert({
      family_id: parsed.family_id,
      child_id: parsed.child_id,
      title: parsed.title.trim(),
      created_by: userId,
    })
    .select("id,family_id,child_id,title,cover_url,created_by,created_at")
    .single();

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("child_albums") && (msg.includes("schema cache") || msg.includes("does not exist"))) {
      throw new Error(
        "Chưa cài bảng album trên Supabase. Chạy migration 20260617150000_child_albums.sql trong SQL Editor.",
      );
    }
    throw new Error(msg);
  }
  return { album: row as any as ChildAlbum };
}

export async function getChildAlbum(data: {
  album_id: string;
  family_id: string;
}) {
  const parsed = z
    .object({ album_id: z.string().uuid(), family_id: z.string().uuid() })
    .parse(data);

  const { supabase } = await requireUser();
  const { data: album, error } = await (supabase as any)
    .from("child_albums")
    .select("id,family_id,child_id,title,cover_url,created_by,created_at")
    .eq("id", parsed.album_id)
    .eq("family_id", parsed.family_id)
    .maybeSingle();

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("child_albums") && (msg.includes("schema cache") || msg.includes("does not exist"))) {
      throw new Error(
        "Chưa cài bảng album trên Supabase. Chạy migration 20260617150000_child_albums.sql trong SQL Editor.",
      );
    }
    throw new Error(msg);
  }
  if (!album) throw new Error("Không tìm thấy album");

  const { data: moments, error: mErr } = await (supabase as any)
    .from("child_moments")
    .select("id,title,caption,media_url,thumbnail_url,taken_at,created_at")
    .eq("album_id", parsed.album_id)
    .order("taken_at", { ascending: false });

  if (mErr) throw new Error(mErr.message);
  return { album: album as any as ChildAlbum, moments: moments ?? [] };
}

export async function updateChildAlbum(data: {
  id: string;
  family_id: string;
  title: string;
  cover_url?: string | null;
}) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      family_id: z.string().uuid(),
      title: z.string().min(1).max(120),
      cover_url: z.string().url().max(2000).nullable().optional(),
    })
    .parse(data);

  const { supabase } = await requireUser();
  const patch: { title: string; cover_url?: string | null } = { title: parsed.title.trim() };
  if (parsed.cover_url !== undefined) patch.cover_url = parsed.cover_url;

  const { error } = await (supabase as any)
    .from("child_albums")
    .update(patch)
    .eq("id", parsed.id)
    .eq("family_id", parsed.family_id);

  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function deleteChildAlbum(data: { id: string; family_id: string }) {
  const parsed = z
    .object({ id: z.string().uuid(), family_id: z.string().uuid() })
    .parse(data);

  const { supabase } = await requireUser();
  const { error } = await (supabase as any)
    .from("child_albums")
    .delete()
    .eq("id", parsed.id)
    .eq("family_id", parsed.family_id);

  if (error) throw new Error(error.message);
  return { ok: true as const };
}
