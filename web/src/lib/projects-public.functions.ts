import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Public list of buildings/projects for signup dropdown. Returns minimal fields only. */
export const listPublicProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, city")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return { projects: data ?? [] };
});
