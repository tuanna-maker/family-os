import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MOBILE_APK_BUCKET } from "@/lib/mobile-apk";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SIGNED_URL_TTL_SEC = 600;

const LOCAL_APK_PATHS: Record<string, string[]> = {
  "stos-guard.apk": [
    join(process.cwd(), "public", "downloads", "stos-guard.apk"),
    join(process.cwd(), "..", "mobile", "guard", "release", "guard-app-release.apk"),
  ],
  "stos-family.apk": [
    join(process.cwd(), "public", "downloads", "stos-family.apk"),
    join(process.cwd(), "..", "mobile", "family", "release", "app-release.apk"),
  ],
};

/** Fallback GitHub Releases — cập nhật khi publish APK mới (npm run publish:mobile-apks). */
const FALLBACK_APK_URLS: Record<string, string> = {
  "stos-guard.apk": "https://github.com/tuanna-maker/family-os/releases/download/mobile-apk-20260607/stos-guard.apk",
  "stos-family.apk": "https://github.com/tuanna-maker/family-os/releases/download/mobile-apk-20260607/stos-family.apk",
};

function externalApkUrl(fileName: string): string | null {
  const fromEnv =
    fileName === "stos-guard.apk"
      ? process.env.VITE_GUARD_APK_URL
      : process.env.VITE_FAMILY_APK_URL;
  const env = fromEnv?.trim();
  if (env) return env;
  const fallback = FALLBACK_APK_URLS[fileName]?.trim();
  return fallback || null;
}

function apkHeaders(fileName: string) {
  return {
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
  };
}

async function readLocalApk(fileName: string): Promise<Buffer | null> {
  for (const filePath of LOCAL_APK_PATHS[fileName] ?? []) {
    try {
      return await readFile(filePath);
    } catch {
      // thử đường dẫn tiếp theo
    }
  }
  return null;
}

async function redirectSignedApk(fileName: string): Promise<Response | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(MOBILE_APK_BUCKET)
      .createSignedUrl(fileName, SIGNED_URL_TTL_SEC, { download: fileName });

    if (error || !data?.signedUrl) {
      console.error(`[serve-apk] signed URL failed for ${fileName}:`, error?.message);
      return null;
    }

    return Response.redirect(data.signedUrl, 302);
  } catch (e) {
    console.error(`[serve-apk] supabase admin error for ${fileName}:`, e);
    return null;
  }
}

export async function serveApk(fileName: string): Promise<Response> {
  const external = externalApkUrl(fileName);
  if (external) {
    return Response.redirect(external, 302);
  }

  const local = await readLocalApk(fileName);
  if (local) {
    return new Response(local, { status: 200, headers: apkHeaders(fileName) });
  }

  const signed = await redirectSignedApk(fileName);
  if (signed) return signed;

  return new Response("APK chưa sẵn sàng. Vui lòng thử lại sau.", { status: 503 });
}
