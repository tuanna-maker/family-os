/**
 * Run Gradle in apps/<app>/android (cross-platform).
 * On Windows with Unicode project paths, maps repo to SUBST drive (Java/Gradle limitation).
 * Usage: node scripts/android-build.mjs family|guard [assembleDebug|assembleRelease]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = process.argv[2];
const task = process.argv[3] ?? "assembleDebug";

if (!app) {
  console.error("Usage: node scripts/android-build.mjs family|guard [assembleDebug|assembleRelease]");
  process.exit(1);
}

const WRAPPER_URL =
  "https://github.com/gradle/gradle/raw/v8.2.1/gradle/wrapper/gradle-wrapper.jar";

async function ensureGradleWrapper(androidDir) {
  const jarPath = path.join(androidDir, "gradle", "wrapper", "gradle-wrapper.jar");
  if (fs.existsSync(jarPath) && fs.statSync(jarPath).size > 10_000) return;
  fs.mkdirSync(path.dirname(jarPath), { recursive: true });
  console.log("Downloading gradle-wrapper.jar …");
  const res = await fetch(WRAPPER_URL);
  if (!res.ok) throw new Error(`gradle-wrapper download failed: ${res.status}`);
  fs.writeFileSync(jarPath, Buffer.from(await res.arrayBuffer()));
}

function resolveAndroidCwd() {
  const androidDir = path.join(ROOT, "apps", app, "android");
  if (process.platform !== "win32" || !/[^\u0000-\u007f]/.test(ROOT)) {
    return androidDir;
  }
  const drive = process.env.STOS_SUBST_DRIVE ?? "S:";
  const substRoot = `${drive}\\`;
  if (!fs.existsSync(substRoot)) {
    const r = spawnSync("subst", [drive, ROOT], { shell: true, stdio: "inherit" });
    if (r.status !== 0) {
      console.warn(
        "WARN: subst failed — clone repo to an ASCII path (e.g. C:\\dev\\family-os) if Gradle errors.",
      );
      return androidDir;
    }
  }
  return path.join(substRoot, "apps", app, "android");
}

const sdk =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");

const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
};

const androidDir = resolveAndroidCwd();
await ensureGradleWrapper(androidDir);

const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const result = spawnSync(gradle, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: true,
  env,
});

process.exit(result.status ?? 1);
