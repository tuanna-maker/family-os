/**
 * Converts copied *.{functions.ts -> .ts} from TanStack Start to client Supabase API.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const API_DIRS = [
  path.join(ROOT, "apps/family/src/api"),
  path.join(ROOT, "apps/guard/src/api"),
];

function convertFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let s = fs.readFileSync(filePath, "utf8");
  if (!s.includes("createServerFn")) {
    // Still fix imports
    s = s.replace(/@\/integrations\/supabase\/auth-middleware/g, "@shared/supabase/auth");
    s = s.replace(/@\/integrations\/supabase\/client/g, "@shared/supabase/client");
    s = s.replace(/requireSupabaseAuth/g, "requireUser");
    fs.writeFileSync(filePath, s);
    return;
  }

  s = s.replace(/import \{ createServerFn \} from "@tanstack\/react-start";\n/g, "");
  s = s.replace(
    /import \{ requireSupabaseAuth \} from "@\/integrations\/supabase\/auth-middleware";\n/g,
    'import { requireUser } from "@shared/supabase/auth";\n',
  );
  s = s.replace(/@\/integrations\/supabase\//g, "@shared/supabase/");
  s = s.replace(/@\/features\/security-ops/g, "@/features/security-ops");

  // export const name = createServerFn(...)...handler(async ({ data, context }) => {
  s = s.replace(
    /export const (\w+) = createServerFn\(\{ method: "[^"]+" \}\)\s*(?:\.middleware\(\[requireSupabaseAuth\]\)\s*)?(?:\.inputValidator\([\s\S]*?\)\s*)?\.handler\(async \(\{ data, context \}\)(?:: [^)]+)? => \{/g,
    "export async function $1(data: any) {\n  const { supabase, userId } = await requireUser();\n",
  );

  // handler without data: async ({ context }) =>
  s = s.replace(
    /export const (\w+) = createServerFn\(\{ method: "[^"]+" \}\)\s*(?:\.middleware\(\[requireSupabaseAuth\]\)\s*)?\.handler\(async \(\{ context \}\)(?:: [^)]+)? => \{/g,
    "export async function $1() {\n  const { supabase, userId } = await requireUser();\n",
  );

  // Close extra }); at end of each function - replace trailing }); with }
  // Heuristic: createServerFn blocks end with `});` before next export
  s = s.replace(/\n\}\);\n\nexport/g, "\n}\n\nexport");
  s = s.replace(/\n\}\);\n$/g, "\n}\n");

  fs.writeFileSync(filePath, s);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".ts")) convertFile(p);
  }
}

for (const d of API_DIRS) walk(d);
console.log("convert-api: done");
