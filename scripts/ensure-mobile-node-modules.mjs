#!/usr/bin/env node
/**
 * Expo/RN resolve entry via ./node_modules — monorepo hoists deps to repo root.
 * Symlink mobile app node_modules to repo root node_modules (family & guard).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.EAS_BUILD === "true") {
  console.log("[ensure-mobile-node-modules] skip on EAS Build (deps hoisted at repo root)");
  process.exit(0);
}

for (const app of ["family", "guard"]) {
  const mobileDir = path.join(ROOT, "mobile", app);
  const linkPath = path.join(mobileDir, "node_modules");
  const target = path.join(ROOT, "node_modules");

  if (!fs.existsSync(target)) {
    console.warn(`[ensure-mobile-node-modules] skip ${app}: missing ${target}`);
    continue;
  }

  if (fs.existsSync(linkPath)) {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const current = fs.readlinkSync(linkPath);
      if (path.resolve(path.dirname(linkPath), current) === target) continue;
    }
    fs.rmSync(linkPath, { recursive: true, force: true });
  }

  fs.symlinkSync(path.relative(mobileDir, target), linkPath);
  console.log(`[ensure-mobile-node-modules] ${app}: node_modules → ../../node_modules`);
}
