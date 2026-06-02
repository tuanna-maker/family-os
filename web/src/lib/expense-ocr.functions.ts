import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Entitlement = {
  plan: "free" | "premium";
  quota: number;
  used: number;
  remaining: number;
  insights_enabled: boolean;
};

export type OcrJob = {
  id: string;
  status: "queued" | "processing" | "done" | "failed";
  image_path: string;
  last_error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type OcrResult = {
  job_id: string;
  merchant: string | null;
  total: number | null;
  scanned_date: string | null;
  category: string | null;
  line_items: Array<{ name: string; qty?: number; price?: number }> | null;
  confidence: number | null;
};

const FamilyOnly = z.object({ family_id: z.string().uuid() });

export const getOcrEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FamilyOnly.parse(d))
  .handler(async ({ data, context }): Promise<Entitlement> => {
    const { data: row, error } = await context.supabase
      .rpc("get_ocr_entitlement", { _family_id: data.family_id });
    if (error) throw new Error(error.message);
    const r = Array.isArray(row) ? row[0] : row;
    return {
      plan: (r?.plan ?? "free") as "free" | "premium",
      quota: Number(r?.quota ?? 0),
      used: Number(r?.used ?? 0),
      remaining: Number(r?.remaining ?? 0),
      insights_enabled: Boolean(r?.insights_enabled ?? false),
    };
  });

export const enqueueOcrJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      family_id: z.string().uuid(),
      image_path: z.string().min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("enqueue_ocr_job", {
      _family_id: data.family_id,
      _image_path: data.image_path,
    });
    if (error) throw new Error(error.message);
    return { job_id: id as string };
  });

export const getOcrJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{
    job: OcrJob;
    result: OcrResult | null;
  }> => {
    const { supabase } = context;
    const [{ data: job, error: jerr }, { data: res }] = await Promise.all([
      supabase
        .from("receipt_ocr_jobs")
        .select("id, status, image_path, last_error, created_at, completed_at")
        .eq("id", data.id)
        .maybeSingle(),
      supabase
        .from("receipt_ocr_results")
        .select("job_id, merchant, total, scanned_date, category, line_items, confidence")
        .eq("job_id", data.id)
        .maybeSingle(),
    ]);
    if (jerr) throw new Error(jerr.message);
    if (!job) throw new Error("Không tìm thấy công việc OCR");
    return {
      job: job as OcrJob,
      result: (res ?? null) as OcrResult | null,
    };
  });

export const listRecentOcrJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FamilyOnly.parse(d))
  .handler(async ({ data, context }): Promise<OcrJob[]> => {
    const { data: rows, error } = await context.supabase
      .from("receipt_ocr_jobs")
      .select("id, status, image_path, last_error, created_at, completed_at")
      .eq("family_id", data.family_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []) as OcrJob[];
  });
