/**
 * Đồng bộ web từ origin/main vào ./web/ — không merge cả nhánh main.
 *
 * Trên main:     src/, supabase/, package.json, ... (ở thư mục gốc repo)
 * Trên monorepo: web/src/, web/supabase/, web/package.json, ...
 *
 * Usage:
 *   node scripts/sync-web-from-main.mjs           # áp dụng
 *   node scripts/sync-web-from-main.mjs --dry-run # chỉ liệt kê
 *   SYNC_WEB_BRANCH=origin/main node scripts/sync-web-from-main.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "web");
const BRANCH = process.env.SYNC_WEB_BRANCH || "origin/main";
const DRY_RUN = process.argv.includes("--dry-run");

/** Các path ở gốc nhánh main → copy vào web/<path> */
const SYNC_ITEMS = [
  "src",
  "supabase",
  "tests",
  "public",
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "tsconfig.json",
  "eslint.config.js",
  "components.json",
  "playwright.config.ts",
  "wrangler.jsonc",
  ".prettierrc",
  ".prettierignore",
  "bun.lock",
  "bunfig.toml",
  "Dockerfile",
  ".dockerignore",
  "docker-compose.yml",
];

/** Không ghi đè — giữ file local trong web/ */
const PRESERVE_UNDER_WEB = [
  ".env",
  "public/downloads",
];

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", cwd: ROOT, stdio: opts.silent ? "pipe" : "inherit", ...opts });
}

function existsOnBranch(item) {
  try {
    run(`git cat-file -e ${BRANCH}:${item}`, { silent: true });
    return true;
  } catch {
    return false;
  }
}

function preservePaths() {
  const saved = new Map();
  for (const rel of PRESERVE_UNDER_WEB) {
    const abs = path.join(WEB, rel);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "web-preserve-"));
      const dest = path.join(tmp, path.basename(rel));
      fs.cpSync(abs, dest, { recursive: true });
      saved.set(rel, { kind: "dir", path: dest, tmpRoot: tmp });
    } else {
      saved.set(rel, { kind: "file", content: fs.readFileSync(abs) });
    }
  }
  return saved;
}

function restorePreserved(saved) {
  for (const [rel, entry] of saved) {
    const abs = path.join(WEB, rel);
    if (entry.kind === "file") {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, entry.content);
    } else {
      fs.rmSync(abs, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.cpSync(entry.path, abs, { recursive: true });
      fs.rmSync(entry.tmpRoot, { recursive: true, force: true });
    }
  }
}

console.log(`\nSync web: ${BRANCH} → web/\n`);

run("git fetch origin main");

const items = SYNC_ITEMS.filter(existsOnBranch);
const missing = SYNC_ITEMS.filter((i) => !items.includes(i));
if (missing.length) {
  console.log("Bỏ qua (không có trên main):", missing.join(", "));
}

if (items.length === 0) {
  console.error("Không có path nào để sync.");
  process.exit(1);
}

console.log("Sẽ sync:", items.join(", "));

if (DRY_RUN) {
  console.log("\n--dry-run: không ghi file. Chạy lại không có --dry-run để áp dụng.\n");
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sync-web-main-"));
const archive = path.join(tmp, "bundle.tar");
const extractDir = path.join(tmp, "out");

try {
  const preserved = preservePaths();

  run(`git archive ${BRANCH} ${items.map((i) => `"${i}"`).join(" ")} -o "${archive}"`, { silent: true });
  fs.mkdirSync(extractDir, { recursive: true });
  run(`tar -xf "${archive}"`, { cwd: extractDir, silent: true });

  if (!fs.existsSync(WEB)) fs.mkdirSync(WEB, { recursive: true });

  for (const item of items) {
    const src = path.join(extractDir, item);
    const dest = path.join(WEB, item);
    if (!fs.existsSync(src)) continue;
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log(`  ✓ web/${item}`);
  }

  restorePreserved(preserved);

  console.log("\nXong. Kiểm tra: git status web/");
  console.log("Sau đó: cd web && npm install");
  console.log("Port sang mobile/apps theo WEB_MOBILE_SYNC.md nếu cần.\n");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
