import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(ent.name)) {
      let s = fs.readFileSync(p, "utf8");
      const n = s;
      s = s.replaceAll("@/lib/require-auth", "@/api/require-auth");
      s = s.replaceAll("@/lib/resolve-destination", "@shared/utils");
      if (s !== n) fs.writeFileSync(p, s);
    }
  }
}

walk(path.join(ROOT, "apps/family/src"));
walk(path.join(ROOT, "apps/guard/src"));
console.log("fix-imports done");
