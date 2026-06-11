#!/usr/bin/env node
/** Sync Supabase env from apps/* → mobile/* (.env for Expo). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

const pairs = [
  ["family", "family"],
  ["guard", "guard"],
];

for (const [appKey, mobileKey] of pairs) {
  const src = readEnv(path.join(ROOT, "apps", appKey, ".env"));
  const dest = path.join(ROOT, "mobile", mobileKey, ".env");
  const url = src.VITE_SUPABASE_URL ?? src.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    src.VITE_SUPABASE_PUBLISHABLE_KEY ?? src.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn(`[sync-mobile-env] skip ${mobileKey}: missing Supabase in apps/${appKey}/.env`);
    continue;
  }
  const scheme =
    mobileKey === "family" ? "vn.unicom.stos.familyrn" : "vn.unicom.stos.guardrn";
  const lines = [
    `EXPO_PUBLIC_SUPABASE_URL=${url}`,
    `EXPO_PUBLIC_SUPABASE_ANON_KEY=${key}`,
    `EXPO_PUBLIC_AUTH_REDIRECT_URL=${scheme}://auth`,
    `EXPO_PUBLIC_PILOT_PREFILL=${src.VITE_PILOT_PREFILL ?? "true"}`,
  ];
  if (mobileKey === "family") {
    lines.push("EXPO_PUBLIC_EAS_PROJECT_ID=29b5786e-10b8-41e9-88dd-dddbe1af9e56");
  }
  fs.writeFileSync(dest, `${lines.join("\n")}\n`);
  console.log(`[sync-mobile-env] wrote mobile/${mobileKey}/.env`);
}
