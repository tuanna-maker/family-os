#!/usr/bin/env node
/**
 * Upload APK lên Supabase Storage (bucket mobile-apks).
 * Cần: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong môi trường.
 *
 *   $env:SUPABASE_URL="https://xxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   node scripts/upload-mobile-apks.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  }
}

loadDotEnv(join(ROOT, "web", ".env"));
loadDotEnv(join(ROOT, "web", ".env.local"));

function jwtRole(token) {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  console.error("Lấy service_role key tại: Supabase Dashboard → Settings → API → service_role (secret)");
  process.exit(1);
}

if (key.includes("<") || key.includes(">") || /[^\x20-\x7E]/.test(key)) {
  console.error("SUPABASE_SERVICE_ROLE_KEY không hợp lệ.");
  console.error("Bạn đang dán placeholder — cần JWT thật (bắt đầu eyJ..., chỉ ký tự ASCII).");
  console.error("Ví dụ: $env:SUPABASE_SERVICE_ROLE_KEY=\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"");
  process.exit(1);
}

if (!key.startsWith("eyJ")) {
  console.error("SUPABASE_SERVICE_ROLE_KEY phải là JWT bắt đầu bằng eyJ...");
  process.exit(1);
}

const role = jwtRole(key);
if (role !== "service_role") {
  console.error(`Key hiện tại có role="${role}" — cần service_role (secret), KHÔNG phải anon/publishable.`);
  console.error("Supabase Dashboard → Settings → API → service_role → Reveal → copy");
  process.exit(1);
}

const BUCKET = "mobile-apks";

const targets = [
  {
    label: "STOS Guard (com.stos.guard)",
    dest: "stos-guard.apk",
    sources: [
      join(ROOT, "mobile", "guard", "release", "guard-app-release.apk"),
      join(ROOT, "web", "public", "downloads", "stos-guard.apk"),
    ],
    buildCmd: "npm run android:mobile-guard",
  },
  {
    label: "STOS Family (vn.unicom.stos.familyrn)",
    dest: "stos-family.apk",
    sources: [
      join(ROOT, "mobile", "family", "release", "app-release.apk"),
      join(ROOT, "web", "public", "downloads", "stos-family.apk"),
    ],
    buildCmd: "npm run android:mobile-family",
  },
];

function resolveSource(sources) {
  for (const p of sources) {
    if (existsSync(p)) return p;
  }
  return null;
}

for (const { label, dest, sources, buildCmd } of targets) {
  const src = resolveSource(sources);
  if (!src) {
    console.warn(`SKIP ${label} (${dest}): không tìm thấy APK`);
    console.warn(`  Chạy: ${buildCmd}`);
    continue;
  }
  const body = readFileSync(src);
  console.log(`Uploading ${label} → ${dest} (${(body.length / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`  nguồn: ${src}`);

  const endpoint = `${url}/storage/v1/object/${BUCKET}/${dest}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/vnd.android.package-archive",
      "x-upsert": "true",
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error(`FAIL ${dest}: HTTP ${res.status}`);
    console.error(detail);
    if (detail.includes("is_family_member")) {
      console.error(
        "\nGợi ý: chạy migration 20260606160000_mobile_apks_upload_policy.sql trên Supabase trước khi upload.",
      );
    }
    process.exit(1);
  }

  console.log(`OK ${dest} → ${url}/storage/v1/object/public/${BUCKET}/${dest}`);
}

console.log("\nXong. QR trên web sẽ tải APK qua Supabase sau khi deploy.");
