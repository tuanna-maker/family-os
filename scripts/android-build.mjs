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
  "mobile-guard": ["mobile", "guard"],
};

const app = process.argv[2];
const task = process.argv[3] ?? "assembleDebug";

if (!app || !APP_ROOTS[app]) {
  console.error(
    "Usage: node scripts/android-build.mjs family|guard|mobile-family|mobile-guard [assembleDebug|assembleRelease]",
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
const mobileGuardRoot = path.join(ROOT, "mobile", "guard");
if (app === "mobile-family") {
  env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
  env.METRO_CONFIG = path.join(mobileFamilyRoot, "metro.config.js");
  env.EXPO_ROUTER_APP_ROOT = "./app";
}
if (app === "mobile-guard") {
  env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
  env.METRO_CONFIG = path.join(mobileGuardRoot, "metro.config.js");
  env.EXPO_ROUTER_APP_ROOT = "./src/app";
}

const androidDir = resolveAndroidCwd();
await ensureGradleWrapper(androidDir);

function ensureLocalProperties(dir) {
  const lp = path.join(dir, "local.properties");
  if (fs.existsSync(lp)) return;
  const sdk = (env.ANDROID_HOME ?? "").replace(/\\/g, "\\\\");
  if (sdk) fs.writeFileSync(lp, `sdk.dir=${sdk}\n`);
}

function clearApkOutputDir(dir) {
  if (!fs.existsSync(dir)) return;
  // Windows: chỉ xóa file bên trong, giữ thư mục — tránh lỗi "Unable to delete directory" khi bị khóa.
  try {
    for (const name of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, name), { recursive: true, force: true });
    }
    return;
  } catch {
    // fallback: đổi tên cả thư mục
  }
  const stale = `${dir}.old.${Date.now()}`;
  try {
    fs.renameSync(dir, stale);
    fs.rmSync(stale, { recursive: true, force: true });
  } catch {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      console.warn(`WARN: Could not clear ${dir} — close Explorer/IDE if build fails.`);
    }
  }
}

function ensureWorkspaceNodeLinks(appRoot, packages, label) {
  const appNm = path.join(appRoot, "node_modules");
  const guardNm = path.join(ROOT, "mobile", "guard", "node_modules");
  const rootNm = path.join(ROOT, "node_modules");
  fs.mkdirSync(appNm, { recursive: true });
  for (const pkg of packages) {
    const local = path.join(appNm, pkg);
    const src = fs.existsSync(path.join(guardNm, pkg))
      ? path.join(guardNm, pkg)
      : path.join(rootNm, pkg);
    if (fs.existsSync(local) || !fs.existsSync(src)) continue;
    console.log(`Linking ${pkg} → ${label}/node_modules …`);
    if (process.platform === "win32") {
      spawnSync("cmd", ["/c", "mklink", "/J", local, src], { shell: true, stdio: "inherit" });
    } else {
      fs.symlinkSync(src, local, "dir");
    }
  }
}

function ensureGuardNodeLinks(guardRoot) {
  ensureWorkspaceNodeLinks(
    guardRoot,
    ["react-native", "nativewind", "tailwindcss", "react-native-css-interop"],
    "mobile/guard",
  );
}

ensureLocalProperties(androidDir);
if (app === "mobile-guard") ensureGuardNodeLinks(mobileGuardRoot);
// Family resolves native deps from monorepo root node_modules — junctions break Metro SHA-1 on Windows.

const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
spawnSync(gradle, ["--stop"], { cwd: androidDir, shell: true, stdio: "ignore" });
if (task.includes("Release")) {
  const releaseApkDirs = [
    path.join(androidDirFromRoot(ROOT), "..", "release", "gradle-app-build", "outputs", "apk", "release"),
    path.join(androidDir, "app", "build", "outputs", "apk", "release"),
  ];
  for (const d of releaseApkDirs) clearApkOutputDir(d);
}

const result = spawnSync(gradle, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: true,
  env,
});

if (result.status === 0 && (task === "assembleRelease" || task === "assembleDebug")) {
  const androidRoot = androidDirFromRoot(ROOT);
  const variant = task === "assembleRelease" ? "release" : "debug";
  const apkCandidates = [
    path.join(androidRoot, "app", "build", "outputs", "apk", variant),
    path.join(androidRoot, "..", "release", "gradle-app-build", "outputs", "apk", variant),
  ];
  const apkDir = apkCandidates.find((d) => fs.existsSync(path.join(d, `app-${variant}.apk`)) || fs.existsSync(path.join(d, `app-${variant}-unsigned.apk`))) ?? apkCandidates[0];
  const signed = path.join(apkDir, `app-${variant}.apk`);
  const unsigned = path.join(apkDir, `app-${variant}-unsigned.apk`);
  const src = fs.existsSync(signed) ? signed : unsigned;
  if (fs.existsSync(src)) {
    const destDir = releaseDirFromRoot(ROOT);
    fs.mkdirSync(destDir, { recursive: true });
    const destName =
      app === "mobile-guard"
        ? variant === "release"
          ? "guard-app-release.apk"
          : "guard-app-debug.apk"
        : variant === "release"
          ? "app-release.apk"
          : "app-debug.apk";
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
