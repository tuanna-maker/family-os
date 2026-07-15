#!/usr/bin/env node
/** Fail fast if hoisted react ≠ 19.2.3 (RN 0.85 renderer mismatch crashes release APK). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = "19.2.3";

for (const pkg of ["react", "react-dom"]) {
  const file = path.join(ROOT, "node_modules", pkg, "package.json");
  if (!fs.existsSync(file)) {
    console.error(`[verify-mobile-react] Missing ${pkg}. Run npm install.`);
    process.exit(1);
  }
  const version = JSON.parse(fs.readFileSync(file, "utf8")).version;
  if (version !== REQUIRED) {
    console.error(
      `[verify-mobile-react] ${pkg}@${version} — mobile APK requires ${REQUIRED}.\n` +
        `  Run: npm install react@${REQUIRED} react-dom@${REQUIRED} --legacy-peer-deps`,
    );
    process.exit(1);
  }
}

console.log(`[verify-mobile-react] react + react-dom @ ${REQUIRED} OK`);
