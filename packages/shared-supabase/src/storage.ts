import type { SupportedStorage } from "@supabase/supabase-js";

/** Capacitor Preferences when native; localStorage on web dev. */
export function createAuthStorage(): SupportedStorage {
  const isNative =
    typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

  if (!isNative) {
    return typeof window !== "undefined" ? window.localStorage : undefined!;
  }

  return {
    getItem: async (key: string) => {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key });
      return value;
    },
    setItem: async (key: string, value: string) => {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key, value });
    },
    removeItem: async (key: string) => {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.remove({ key });
    },
  };
}
