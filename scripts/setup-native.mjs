/**
 * One-time native project bootstrap: resources → cap add → assets → permissions.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, cwd) {
  console.log(`\n> ${cmd} ${args.join(" ")}  (${cwd})`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const app of ["family", "guard"]) {
  run("node", [path.join(ROOT, "scripts/generate-cap-resources.mjs"), app], ROOT);

  const appDir = path.join(ROOT, "apps", app);
  run("npm", ["run", "build"], appDir);

  const hasAndroid = fs.existsSync(path.join(appDir, "android"));
  const hasIos = fs.existsSync(path.join(appDir, "ios"));
  if (!hasAndroid) run("npx", ["cap", "add", "android"], appDir);
  if (!hasIos) run("npx", ["cap", "add", "ios"], appDir);

  run("npx", ["cap", "sync"], appDir);
  run("npm", ["run", "cap:assets"], appDir);
  run("node", [path.join(ROOT, "scripts/patch-native-permissions.mjs"), app], ROOT);
  run("npx", ["cap", "sync"], appDir);
  run("node", [path.join(ROOT, "scripts/bootstrap-gradle-wrapper.mjs")], ROOT);
}

console.log("\nNative setup complete for family + guard.");
