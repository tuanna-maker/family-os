// Web entry — re-export lazy singleton for backward compatibility.
export { getWebSupabase as getSupabaseClient } from "./client-web";
export { supabase, getSupabase, initSupabase } from "./get-client";
