#!/usr/bin/env node
/**
 * Copy APK release mới nhất → web/public/downloads (để đính kèm Lovable / upload).
 * Nguồn chuẩn:
 *   Guard  → mobile/guard/release/guard-app-release.apk
 *   Family → mobile/family/release/app-release.apk
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "web", "public", "downloads");

const PAIRS = [
  {
    label: "STOS Guard (com.stos.guard)",
    src: join(ROOT, "mobile", "guard", "release", "guard-app-release.apk"),
    dest: join(OUT_DIR, "stos-guard.apk"),
    buildCmd: "npm run android:mobile-guard",
  },
  {
    label: "STOS Family (vn.unicom.stos.familyrn)",
    src: join(ROOT, "mobile", "family", "release", "app-release.apk"),
    dest: join(OUT_DIR, "stos-family.apk"),
    buildCmd: "npm run android:mobile-family",
  },
];

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

mkdirSync(OUT_DIR, { recursive: true });

let ok = true;
for (const { label, src, dest, buildCmd } of PAIRS) {
  if (!existsSync(src)) {
    console.error(`MISSING ${label}`);
    console.error(`  Chưa có: ${src}`);
    console.error(`  Chạy: ${buildCmd}`);
    ok = false;
    continue;
  }
  copyFileSync(src, dest);
  const hash = sha256(dest).slice(0, 16);
  const mb = (readFileSync(dest).length / 1024 / 1024).toFixed(1);
  console.log(`OK ${label}`);
  console.log(`  ${src}`);
  console.log(`  → ${dest} (${mb} MB, sha256:${hash}…)`);
}

if (!ok) process.exit(1);
console.log("\nĐã sync. Dùng file trong web/public/downloads/ để gửi Lovable.");
