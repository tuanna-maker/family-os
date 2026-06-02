import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Moment = {
  id: string;
  family_id: string;
  created_by: string;
  caption: string | null;
  media_url: string;
  media_type: "image" | "video";
  thumbnail_url: string | null;
  taken_at: string;
  tagged_member_ids: string[];
  created_at: string;
};

export type Reaction = {
  id: string;
  moment_id: string;
  user_id: string;
  emoji: string;
};

export type Comment = {
  id: string;
  moment_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

const FamilyOnly = z.object({ family_id: z.string().uuid() });

export const listMoments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => FamilyOnly.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: moments, error } = await supabase
      .from("family_moments")
      .select("id,family_id,created_by,caption,media_url,media_type,thumbnail_url,taken_at,tagged_member_ids,created_at")
      .eq("family_id", data.family_id)
      .order("taken_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const ids = (moments ?? []).map((m) => m.id);
    if (ids.length === 0) return { moments: [] as Moment[], reactions: [] as Reaction[], comments: [] as Comment[] };
    const [reacs, coms] = await Promise.all([
      supabase.from("moment_reactions").select("id,moment_id,user_id,emoji").in("moment_id", ids),
      supabase.from("moment_comments").select("id,moment_id,user_id,body,created_at").in("moment_id", ids).order("created_at"),
    ]);
    return {
      moments: (moments ?? []) as Moment[],
      reactions: (reacs.data ?? []) as Reaction[],
      comments: (coms.data ?? []) as Comment[],
    };
  });

const CreateSchema = z.object({
  family_id: z.string().uuid(),
  media_url: z.string().url().max(1024),
  media_type: z.enum(["image", "video"]).default("image"),
  caption: z.string().max(500).optional(),
  taken_at: z.string().optional(),
  tagged_member_ids: z.array(z.string().uuid()).max(20).default([]),
});

export const createMoment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("family_moments")
      .insert({
        family_id: data.family_id,
        created_by: userId,
        media_url: data.media_url,
        media_type: data.media_type,
        caption: data.caption ?? null,
        taken_at: data.taken_at ?? new Date().toISOString(),
        tagged_member_ids: data.tagged_member_ids,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { moment: row as Moment };
  });

export const deleteMoment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_moments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ReactSchema = z.object({
  moment_id: z.string().uuid(),
  family_id: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ReactSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // try delete first
    const { data: existing } = await supabase
      .from("moment_reactions")
      .select("id")
      .eq("moment_id", data.moment_id)
      .eq("user_id", userId)
      .eq("emoji", data.emoji)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("moment_reactions").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { added: false };
    }
    const { error } = await supabase.from("moment_reactions").insert({
      moment_id: data.moment_id,
      family_id: data.family_id,
      user_id: userId,
      emoji: data.emoji,
    });
    if (error) throw new Error(error.message);
    return { added: true };
  });

const CommentSchema = z.object({
  moment_id: z.string().uuid(),
  family_id: z.string().uuid(),
  body: z.string().min(1).max(500),
});

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CommentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("moment_comments")
      .insert({
        moment_id: data.moment_id,
        family_id: data.family_id,
        user_id: userId,
        body: data.body,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { comment: row as Comment };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("moment_comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
