import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function fixFile(p) {
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("useServerFn")) return;
  s = s.replace(/import \{ useServerFn \} from "@tanstack\/react-start";\n/g, "");
  s = s.replace(/const (\w+) = useServerFn\((\w+)\);\n/g, "");
  s = s.replace(/(\w+)Fn\(\{ data: /g, "$2({ ");
  s = s.replace(/(\w+)Fn\(\)/g, "$2()");
  s = s.replace(/queryFn:\s*\(\)\s*=>\s*(\w+)Fn/g, "queryFn: () => $1");
  s = s.replace(/mutationFn:\s*\(([^)]*)\)\s*=>\s*(\w+)Fn\(/g, "mutationFn: ($1) => $2(");
  s = s.replace(/@\/lib\/security\.functions/g, "@/api/security");
  fs.writeFileSync(p, s);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) fixFile(p);
  }
}

walk(path.join(ROOT, "apps/family/src/features"));
walk(path.join(ROOT, "apps/guard/src/features"));
console.log("fix-features done");
