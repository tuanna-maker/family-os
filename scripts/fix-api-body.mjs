import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function fixFile(p) {
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(
    /const \{ supabase, userId \} = await requireUser\(\);\s*\n\s*const \{ supabase(?:, userId)?(?:, claims)? \} = context;\s*\n/g,
    "const { supabase, userId } = await requireUser();\n",
  );
  s = s.replace(/const \{ supabase(?:, userId)?(?:, claims)? \} = context;\s*\n/g, "");
  s = s.replace(/context\.supabase/g, "supabase");
  s = s.replace(/\n  \}\);\n/g, "\n}\n");
  s = s.replace(/\n\}\);\n$/g, "\n}\n");
  // Fix z.object missing closing paren from broken convert
  s = s.replace(/(const \w+ = z\.object\(\{[\s\S]*?\})\s*\n\nexport/g, (m) => {
    if (m.includes(");")) return m;
    return m.replace(/\}\s*\n\nexport/, "});\n\nexport");
  });
  if (p.endsWith("auth.ts") && p.includes("apps")) {
    s = `export {\n  getMyContext,\n  requireUser,\n  type MyContext,\n  type AppRole,\n} from "@shared/supabase/auth";\n`;
  }
  fs.writeFileSync(p, s);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".ts")) fixFile(p);
  }
}

walk(path.join(ROOT, "apps/family/src/api"));
walk(path.join(ROOT, "apps/guard/src/api"));
console.log("fix-api-body done");
