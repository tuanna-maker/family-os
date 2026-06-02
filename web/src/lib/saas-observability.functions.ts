import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ObsSummary = {
  health_status: "healthy" | "degraded" | "down" | "unknown";
  health_duration_ms: number;
  health_checked_at: string | null;
  health_checks: any;
  degraded_24h: number;
  errors_24h: number;
  warns_24h: number;
  logs_24h: number;
  error_rate_pct: number;
  active_users_24h: number;
  unack_alerts: number;
  critical_alerts: number;
  audit_24h: number;
};

export type ObsTimeseriesPoint = {
  hour: string;
  app: string;
  level: string;
  log_count: number;
};

export type ObsAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  source: string;
  message: string;
  context: any;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

export type ObsErrorLog = {
  id: number;
  ts: string;
  level: string;
  app: string;
  message: string;
  context: any;
  user_id: string | null;
  user_name: string | null;
  request_id: string | null;
};

export type ObsAuditEvent = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: any | null;
  created_at: string;
};

export const getObservabilitySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ObsSummary> => {
    const { data, error } = await context.supabase.rpc("saas_observability_summary");
    if (error) throw new Error(error.message);
    return data as ObsSummary;
  });

export const getObservabilityTimeseries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ hours: z.number().int().min(1).max(168).default(24) }).parse(d))
  .handler(async ({ data, context }): Promise<ObsTimeseriesPoint[]> => {
    const { data: rows, error } = await context.supabase.rpc("saas_observability_timeseries", { _hours: data.hours } as never);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ObsTimeseriesPoint[];
  });

export const listObservabilityAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(100).default(20) }).parse(d))
  .handler(async ({ data, context }): Promise<ObsAlert[]> => {
    const { data: rows, error } = await context.supabase.rpc("saas_observability_recent_alerts", { _limit: data.limit } as never);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ObsAlert[];
  });

export const listObservabilityErrors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(30) }).parse(d))
  .handler(async ({ data, context }): Promise<ObsErrorLog[]> => {
    const { data: rows, error } = await context.supabase.rpc("saas_observability_recent_errors", { _limit: data.limit } as never);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ObsErrorLog[];
  });

export const listObservabilityAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(30) }).parse(d))
  .handler(async ({ data, context }): Promise<ObsAuditEvent[]> => {
    const { data: rows, error } = await context.supabase.rpc("saas_observability_recent_audit", { _limit: data.limit } as never);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ObsAuditEvent[];
  });

export const acknowledgeAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ alert_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("saas_observability_ack_alert", { _alert_id: data.alert_id } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
