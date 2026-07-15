import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

export type FamilyServiceRequest = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  description: string | null;
  created_at: string;
  resolved_at: string | null;
};

export async function listMyServiceRequests(data: { family_id: string }) {
  const { supabase, userId } = await requireUser();
  const { family_id } = z.object({ family_id: z.string().uuid() }).parse(data);
  const { data: rows, error } = await supabase
    .from("service_requests")
    .select("id,title,category,priority,status,description,created_at,resolved_at")
    .eq("family_id", family_id)
    .eq("requester_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (rows ?? []) as FamilyServiceRequest[];
}

export async function createFamilyServiceRequest(data: {
  family_id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
}) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      family_id: z.string().uuid(),
      title: z.string().min(3).max(200),
      description: z.string().max(2000).optional(),
      category: z.string().max(40).default("general"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    })
    .parse(data);
  const { data: project, error: pErr } = await supabase.from("projects").select("id").limit(1).maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!project?.id) throw new Error("Chưa cấu hình dự án tòa nhà");
  const { data: row, error } = await supabase
    .from("service_requests")
    .insert({
      project_id: project.id,
      family_id: parsed.family_id,
      requester_id: userId,
      title: parsed.title,
      description: parsed.description ?? null,
      category: parsed.category,
      priority: parsed.priority,
      status: "open",
    })
    .select("id, status, created_at")
    .single();
  if (error) throw new Error(error.message);
  return row;
}
