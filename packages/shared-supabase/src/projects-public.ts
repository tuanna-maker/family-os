import { supabase } from "./client";

/** Public list of buildings/projects for signup dropdown. */
export async function listPublicProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, city")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return { projects: data ?? [] };
}
