#!/usr/bin/env node
/**
 * Publish APK to GitHub Releases (direct download URLs for QR).
 * Uses git credential for github.com or GITHUB_TOKEN env.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "tuanna-maker/family-os";
const TAG = process.env.MOBILE_APK_TAG ?? `mobile-apk-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

const FILES = [
  {
    label: "Guard",
    local: join(ROOT, "web", "public", "downloads", "stos-guard.apk"),
    asset: "stos-guard.apk",
  },
  {
    label: "Family",
    local: join(ROOT, "web", "public", "downloads", "stos-family.apk"),
    asset: "stos-family.apk",
  },
];

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN?.trim()) return process.env.GITHUB_TOKEN.trim();
  const r = spawnSync("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
  });
  const m = r.stdout?.match(/^password=(.+)$/m);
  return m?.[1]?.trim() ?? null;
}

async function gh(path, { method = "GET", body, headers = {} } = {}) {
  const token = getGitHubToken();
  if (!token) throw new Error("Thiếu GITHUB_TOKEN hoặc git credential github.com");
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers,
    },
    body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${text}`);
  return json;
}

async function ensureRelease(tag) {
  try {
    return await gh(`/repos/${REPO}/releases/tags/${tag}`);
  } catch {
    return await gh(`/repos/${REPO}/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tag_name: tag,
        name: `STOS Mobile APK ${tag}`,
        body: "APK Bảo vệ + Gia đình (React Native). Tải qua QR trên stoslife.lovable.app.",
        draft: false,
        prerelease: false,
      }),
    });
  }
}

async function uploadAsset(releaseId, filePath, name) {
  const token = getGitHubToken();
  const body = readFileSync(filePath);
  const res = await fetch(
    `https://uploads.github.com/repos/${REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/vnd.android.package-archive",
      },
      body,
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Upload ${name} failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  for (const f of FILES) {
    if (!existsSync(f.local)) throw new Error(`Missing ${f.local} — chạy npm run sync:mobile-apks`);
  }

  console.log(`Release tag: ${TAG}`);
  const release = await ensureRelease(TAG);
  console.log(`Release id: ${release.id}`);

  const urls = {};
  for (const f of FILES) {
    const existing = (release.assets ?? []).find((a) => a.name === f.asset);
    if (existing) {
      console.log(`DELETE old ${f.asset}`);
      await gh(`/repos/${REPO}/releases/assets/${existing.id}`, { method: "DELETE" });
    }
    console.log(`UPLOAD ${f.label}…`);
    const asset = await uploadAsset(release.id, f.local, f.asset);
    urls[f.asset] = asset.browser_download_url;
    console.log(`OK ${f.asset} (${(readFileSync(f.local).length / 1024 / 1024).toFixed(1)} MB)`);
  }

  const guardUrl = urls["stos-guard.apk"];
  const familyUrl = urls["stos-family.apk"];

  const serveApkPath = join(ROOT, "web", "src", "lib", "serve-apk.ts");
  let serveApk = readFileSync(serveApkPath, "utf8");
  serveApk = serveApk.replace(
    /"stos-guard\.apk":\s*"[^"]*"/,
    `"stos-guard.apk": "${guardUrl}"`,
  );
  serveApk = serveApk.replace(
    /"stos-family\.apk":\s*"[^"]*"/,
    `"stos-family.apk": "${familyUrl}"`,
  );
  writeFileSync(serveApkPath, serveApk);

  const envPath = join(ROOT, "web", ".env");
  let env = readFileSync(envPath, "utf8");
  const setEnv = (key, val) => {
    const line = `${key}="${val}"`;
    if (new RegExp(`^${key}=`, "m").test(env)) {
      env = env.replace(new RegExp(`^${key}=.*$`, "m"), line);
    } else {
      env += `\n${line}`;
    }
  };
  setEnv("VITE_GUARD_APK_URL", guardUrl);
  setEnv("VITE_FAMILY_APK_URL", familyUrl);
  writeFileSync(envPath, env);

  console.log("\n--- Direct URLs ---");
  console.log(`Guard:  ${guardUrl}`);
  console.log(`Family: ${familyUrl}`);
  console.log("\nĐã cập nhật web/src/lib/serve-apk.ts + web/.env");
  console.log("Publish web lên Lovable để QR production dùng APK mới.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
