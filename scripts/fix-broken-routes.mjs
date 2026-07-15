import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function fix(content) {
  let s = content;
  s = s.replace(/import \{ useServerFn \}[^\n]+\n/g, "");
  s = s.replace(/const \w+ = useServerFn\([^)]+\);\n/g, "");
  s = s.replace(/const \w+ = ;\n/g, "");
  s = s.replace(/\(\{\s*data:\s*(\{[^}]*\})\s*\}\)/g, "($1)");
  s = s.replace(/mutationFn:\s*\(\)\s*=>\s*(\w+)\(\{\s*data:/g, "mutationFn: () => $1(");
  s = s.replace(/mutationFn:\s*\(v\)\s*=>\s*(\w+)\(\{\s*data:/g, "mutationFn: (v) => $1(");
  s = s.replace(/mutationFn:\s*\(vars\)\s*=>\s*(\w+)\(\{\s*data:/g, "mutationFn: (vars) => $1(");
  s = s.replace(/mutationFn:\s*async\s*\([^)]*\)\s*=>\s*(\w+)\(\{\s*data:/g, "mutationFn: async (input) => $1(");
  return s;
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f.endsWith(".tsx")) {
      const raw = fs.readFileSync(p, "utf8");
      const next = fix(raw);
      if (next !== raw) fs.writeFileSync(p, next);
    }
  }
}

walk(path.join(ROOT, "apps/family/src/routes"));
walk(path.join(ROOT, "apps/guard/src/routes"));
console.log("fix-broken-routes done");
