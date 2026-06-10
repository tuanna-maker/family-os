/** URL production cố định — QR phải dùng host public, không dùng localhost. */
export const PUBLIC_SITE_ORIGIN =
  import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://stoslife.lovable.app";

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://bigarvjahnxiuovepaxm.supabase.co";

export const MOBILE_APK_BUCKET = "mobile-apks";

export const MOBILE_APK = {
  family: {
    title: "App Gia đình",
    fileName: "stos-family.apk",
    apiPath: "/api/public/downloads/family",
    directEnvKey: "VITE_FAMILY_APK_URL",
  },
  guard: {
    title: "App Bảo vệ",
    fileName: "stos-guard.apk",
    apiPath: "/api/public/downloads/guard",
    directEnvKey: "VITE_GUARD_APK_URL",
  },
} as const;

/** URL APK host ngoài (override thủ công nếu cần). */
export function directApkUrl(app: keyof typeof MOBILE_APK): string | null {
  const raw =
    app === "guard"
      ? import.meta.env.VITE_GUARD_APK_URL
      : import.meta.env.VITE_FAMILY_APK_URL;
  const url = raw?.trim();
  return url || null;
}

/**
 * URL trong QR + link tải trên landing.
 * Bucket mobile-apks là private → API tạo signed URL (10 phút) rồi redirect.
 */
export function apkDownloadUrl(app: keyof typeof MOBILE_APK, origin?: string) {
  const direct = directApkUrl(app);
  if (direct) return direct;
  const resolvedOrigin =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : PUBLIC_SITE_ORIGIN);
  return `${resolvedOrigin}${MOBILE_APK[app].apiPath}`;
}
