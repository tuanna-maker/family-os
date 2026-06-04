import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export async function listCommunityServices() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("community_services")
    .select("id,slug,name,description,icon,tag,category,base_price")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCommunityEvents() {
  const { supabase } = await requireUser();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("community_events")
    .select("id,title,description,starts_at,ends_at,place,capacity,cover_url")
    .eq("active", true)
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(30);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function registerCommunityEvent(data: { event_id: string; family_id?: string; guests_count?: number }) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      event_id: z.string().uuid(),
      family_id: z.string().uuid().optional(),
      guests_count: z.number().min(1).max(20).default(1),
    })
    .parse(data);
  const { error } = await supabase.from("event_registrations").upsert(
    {
      event_id: parsed.event_id,
      user_id: userId,
      family_id: parsed.family_id ?? null,
      guests_count: parsed.guests_count,
      status: "going",
    },
    { onConflict: "event_id,user_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function createServiceBooking(data: {
  service_id: string;
  family_id: string;
  contact_phone?: string;
  scheduled_at?: string;
  notes?: string;
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      service_id: z.string().uuid(),
      family_id: z.string().uuid(),
      contact_phone: z.string().max(32).optional(),
      scheduled_at: z.string().optional(),
      notes: z.string().max(500).optional(),
    })
    .parse(data);
  const { data: project } = await supabase.from("projects").select("id").limit(1).maybeSingle();
  const { data: row, error } = await supabase
    .from("service_bookings")
    .insert({
      service_id: parsed.service_id,
      family_id: parsed.family_id,
      project_id: project?.id ?? null,
      requested_by: userId,
      contact_phone: parsed.contact_phone ?? null,
      scheduled_at: parsed.scheduled_at ?? null,
      notes: parsed.notes ?? null,
      status: "pending",
    })
    .select("id, status, created_at")
    .single();
  if (error) throw new Error(error.message);
  return row;
}
