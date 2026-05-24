import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function fixRoutes(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (!f.endsWith(".tsx")) continue;
    let s = fs.readFileSync(p, "utf8");
    s = s.replace(/import \{ useServerFn \} from "@tanstack\/react-router";\n/g, "");
    s = s.replace(/import \{ useServerFn \} from "@tanstack\/react-start";\n/g, "");
    // const xFn = useServerFn(fn) -> removed; queryFn: () => xFn({ data: y }) -> queryFn: () => fn(y)
    s = s.replace(/const (\w+)Fn = useServerFn\((\w+)\);\n/g, "");
    s = s.replace(/(\w+)Fn\(\{ data: /g, "$2({ ");
    s = s.replace(/(\w+)Fn\(\)/g, "$1()");
    s = s.replace(/queryFn:\s*\(\)\s*=>\s*(\w+)Fn\(/g, "queryFn: () => $1(");
    s = s.replace(/mutationFn:\s*\(\)\s*=>\s*(\w+)Fn\(/g, "mutationFn: () => $1(");
    s = s.replace(/mutationFn:\s*\(v\)\s*=>\s*(\w+)Fn\(/g, "mutationFn: (v) => $1(");
    s = s.replace(/mutationFn:\s*\(vars\)\s*=>\s*(\w+)Fn\(/g, "mutationFn: (vars) => $1(");
    s = s.replace(/mutationFn:\s*async\s*\([^)]*\)\s*=>\s*(\w+)Fn\(/g, (m, fn) => m.replace(`${fn}Fn(`, `${fn}(`));
    fs.writeFileSync(p, s);
  }
}

fixRoutes(path.join(ROOT, "apps/family/src/routes"));
fixRoutes(path.join(ROOT, "apps/guard/src/routes"));
console.log("fix-routes: done");
