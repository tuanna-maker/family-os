import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// care.* tables/RPCs are not in generated types yet; cast to any.
// Auth + RLS still enforced server-side via SECURITY DEFINER RPCs.

const locationSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    label: z.string().max(200).optional(),
    address: z.string().max(300).optional(),
  })
  .nullable()
  .optional();

const deviceInfoSchema = z
  .object({
    platform: z.string().max(50).optional(),
    user_agent: z.string().max(500).optional(),
    app_version: z.string().max(50).optional(),
  })
  .partial()
  .optional();

// ===== triggerSos =====
export const triggerSos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      householdId: z.string().uuid(),
      triggerKind: z.enum(["button", "shake", "voice", "fall", "manual"]).default("button"),
      severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
      location: locationSchema,
      deviceInfo: deviceInfoSchema,
      notes: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ eventId: string }> => {
    const sb = context.supabase as any;
    const { data: eventId, error } = await sb.rpc("trigger_sos", {
      _household_id: data.householdId,
      _trigger_kind: data.triggerKind,
      _severity: data.severity,
      _location: data.location ?? null,
      _device_info: data.deviceInfo ?? {},
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { eventId: eventId as string };
  });

// ===== acknowledgeSos =====
export const acknowledgeSos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      eventId: z.string().uuid(),
      notes: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as any;
    const { error } = await sb.rpc("acknowledge_sos", {
      _event_id: data.eventId,
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== resolveSos =====
export const resolveSos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      eventId: z.string().uuid(),
      notes: z.string().max(500).optional(),
      cancelled: z.boolean().default(false),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as any;
    const { error } = await sb.rpc("resolve_sos", {
      _event_id: data.eventId,
      _notes: data.notes ?? null,
      _cancelled: data.cancelled,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== getSosEvent (event + timeline) =====
type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type SosEvent = {
  id: string;
  household_id: string;
  triggered_by: string;
  trigger_kind: string;
  severity: string;
  status: string;
  location: Json;
  device_info: Json;
  ack_at: string | null;
  ack_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SosTimelineEntry = {
  id: string;
  event_id: string;
  actor_id: string | null;
  kind: string;
  payload: Json;
  created_at: string;
};

export const getSosEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{
    event: SosEvent | null;
    timeline: SosTimelineEntry[];
  }> => {
    const sb = context.supabase as any;
    const [{ data: event, error: evErr }, { data: timeline, error: tlErr }] = await Promise.all([
      sb.schema("care").from("sos_event").select("*").eq("id", data.eventId).maybeSingle(),
      sb.schema("care").from("sos_timeline").select("*").eq("event_id", data.eventId).order("created_at", { ascending: true }),
    ]);
    if (evErr) throw new Error(evErr.message);
    if (tlErr) throw new Error(tlErr.message);
    return {
      event: (event as SosEvent | null) ?? null,
      timeline: (timeline as SosTimelineEntry[] | null) ?? [],
    };
  });

// ===== listActiveSos (for guard / security) =====
export const listActiveSos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SosEvent[]> => {
    const sb = context.supabase as any;
    const { data, error } = await sb
      .schema("care")
      .from("sos_event")
      .select("*")
      .in("status", ["triggered", "acknowledged", "dispatched"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as SosEvent[];
  });
