import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { supabasePublicApkUrl } from "@/lib/mobile-apk";

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

const EXTERNAL_APK_URLS: Record<string, string | undefined> = {
  "stos-guard.apk": process.env.VITE_GUARD_APK_URL,
  "stos-family.apk": process.env.VITE_FAMILY_APK_URL,
};

function apkHeaders(fileName: string) {
  return {
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "public, max-age=86400",
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

export async function serveApk(fileName: string): Promise<Response> {
  const local = await readLocalApk(fileName);
  if (local) {
    return new Response(local, { status: 200, headers: apkHeaders(fileName) });
  }

  const external = EXTERNAL_APK_URLS[fileName]?.trim();
  if (external) {
    return Response.redirect(external, 302);
  }

  const remoteUrl = supabasePublicApkUrl(fileName);
  const head = await fetch(remoteUrl, { method: "HEAD" });
  if (!head.ok) {
    return new Response("APK chưa sẵn sàng. Cấu hình VITE_GUARD_APK_URL / VITE_FAMILY_APK_URL.", {
      status: 404,
    });
  }

  return Response.redirect(remoteUrl, 302);
}
