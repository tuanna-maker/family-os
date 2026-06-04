/**
 * Run Gradle in apps/<app>/android or mobile/<app>/android (cross-platform).
 * On Windows with Unicode project paths, maps repo to SUBST drive (Java/Gradle limitation).
 * Usage: node scripts/android-build.mjs family|guard|mobile-family [assembleDebug|assembleRelease]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const APP_ROOTS = {
  family: ["apps", "family"],
  guard: ["apps", "guard"],
  "mobile-family": ["mobile", "family"],
};

const app = process.argv[2];
const task = process.argv[3] ?? "assembleDebug";

if (!app || !APP_ROOTS[app]) {
  console.error(
    "Usage: node scripts/android-build.mjs family|guard|mobile-family [assembleDebug|assembleRelease]",
  );
  process.exit(1);
}

function appRootSegments() {
  return APP_ROOTS[app];
}

function androidDirFromRoot(root) {
  return path.join(root, ...appRootSegments(), "android");
}

function releaseDirFromRoot(root) {
  return path.join(root, ...appRootSegments(), "release");
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
  const androidDir = androidDirFromRoot(ROOT);
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
  return androidDirFromRoot(substRoot);
}

const sdk =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");

const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  NODE_ENV: task.includes("Release") ? "production" : process.env.NODE_ENV ?? "development",
};

const mobileFamilyRoot = path.join(ROOT, "mobile", "family");
if (app === "mobile-family") {
  env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
  env.METRO_CONFIG = path.join(mobileFamilyRoot, "metro.config.js");
  env.EXPO_ROUTER_APP_ROOT = "./app";
}

const androidDir = resolveAndroidCwd();
await ensureGradleWrapper(androidDir);

const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const result = spawnSync(gradle, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: true,
  env,
});

if (result.status === 0 && (task === "assembleRelease" || task === "assembleDebug")) {
  const androidRoot = androidDirFromRoot(ROOT);
  const variant = task === "assembleRelease" ? "release" : "debug";
  const apkDir = path.join(androidRoot, "app", "build", "outputs", "apk", variant);
  const signed = path.join(apkDir, `app-${variant}.apk`);
  const unsigned = path.join(apkDir, `app-${variant}-unsigned.apk`);
  const src = fs.existsSync(signed) ? signed : unsigned;
  if (fs.existsSync(src)) {
    const destDir = releaseDirFromRoot(ROOT);
    fs.mkdirSync(destDir, { recursive: true });
    const destName = variant === "release" ? "app-release.apk" : "app-debug.apk";
    const dest = path.join(destDir, destName);
    fs.copyFileSync(src, dest);
    console.log(`\nAPK: ${dest}`);
    if (variant === "release" && src === unsigned) {
      console.warn(
        "WARN: APK is unsigned — add keystore.properties under " +
          appRootSegments().join("/") +
          "/android (see apps/family) then rebuild.",
      );
    }
  }
}

process.exit(result.status ?? 1);
