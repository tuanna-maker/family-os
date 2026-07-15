import { getSupabase } from "./get-client";

export type UiLocale = "vi" | "en";

export async function syncProfileUiLocale(locale: UiLocale) {
  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ ui_locale: locale }).eq("id", user.id);
    if (error) {
      // Cột ui_locale chưa migrate — bỏ qua, app vẫn dùng locale local.
      console.warn("[syncProfileUiLocale]", error.message);
    }
  } catch (err) {
    console.warn("[syncProfileUiLocale]", err);
  }
}
