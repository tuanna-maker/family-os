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
    storagePath: "/downloads/stos-family.apk",
    apiPath: "/api/public/downloads/family",
    directEnvKey: "VITE_FAMILY_APK_URL",
  },
  guard: {
    title: "App Bảo vệ",
    fileName: "stos-guard.apk",
    storagePath: "/downloads/stos-guard.apk",
    apiPath: "/api/public/downloads/guard",
    directEnvKey: "VITE_GUARD_APK_URL",
  },
} as const;

export function supabasePublicApkUrl(fileName: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${MOBILE_APK_BUCKET}/${fileName}`;
}

/** URL APK host ngoài (GitHub Releases, Drive, …) — ưu tiên hơn Supabase/API. */
export function directApkUrl(app: keyof typeof MOBILE_APK): string | null {
  const raw =
    app === "guard"
      ? import.meta.env.VITE_GUARD_APK_URL
      : import.meta.env.VITE_FAMILY_APK_URL;
  const url = raw?.trim();
  return url || null;
}

/** URL trong mã QR. */
export function apkDownloadUrl(app: keyof typeof MOBILE_APK, origin = PUBLIC_SITE_ORIGIN) {
  const direct = directApkUrl(app);
  if (direct) return direct;
  return `${origin}${MOBILE_APK[app].apiPath}`;
}
