import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function fix(p) {
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(/const \{ supabase \} = context;\n/g, "");
  s = s.replace(/const \{ supabase, userId \} = context;\n/g, "");
  s = s.replace(/\(claims\.email as string\)/g, "user.email");
  if (p.endsWith("auth.ts") && p.includes("apps")) {
    s = `export { getMyContext, requireUser, type MyContext, type AppRole } from "@shared/supabase/auth";\n`;
  }
  fs.writeFileSync(p, s);
}

for (const dir of ["apps/family/src/api", "apps/guard/src/api"]) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (f.endsWith(".ts")) fix(path.join(d, f));
  }
}
console.log("fix-api-context done");
