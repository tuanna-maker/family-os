/**
 * One-shot monorepo migration: copy + rewrite imports + strip TanStack Start.
 * Run: node scripts/migrate-monorepo.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FAMILY_ROUTES = [
  "portal.tsx", "home.tsx", "gia-dinh.tsx", "dashboard.tsx", "con-cai.tsx",
  "cham-soc-ong-ba.tsx", "cham-soc-ong-ba.nhat-ky.tsx", "chi-tieu.tsx", "chi-tieu_.scan.tsx",
  "thuc-pham.tsx", "suc-khoe.tsx", "suc-khoe.quan-ly.tsx", "lich-gia-dinh.tsx",
  "ky-niem-gia-dinh.tsx", "quan-ly-giup-viec.tsx", "du-lich.tsx", "dich-vu.tsx",
  "qr-vao-ra.tsx", "bao-an.tsx", "thong-bao.tsx", "cai-dat.thong-bao.tsx",
  "cong-dong.tsx", "lien-he.tsx", "tai-khoan.tsx",
  "login.tsx", "forgot-password.tsx", "reset-password.tsx",
];

const GUARD_ROUTES = [
  "guard.tsx", "guard.index.tsx", "guard.check-in.tsx", "guard.check-out.tsx",
  "guard.schedule.tsx", "guard.patrol.tsx", "guard.requests.tsx", "guard.incident.tsx",
  "guard.notifications.tsx", "guard.account.tsx",
  "security.tsx", "security.index.tsx",
  "login.tsx",
];

const FAMILY_LIBS = [
  "children.functions.ts", "elderly-care.functions.ts", "expenses.functions.ts",
  "family-events.functions.ts", "family-today.functions.ts", "food.functions.ts",
  "health.functions.ts", "notifications.functions.ts", "notification-prefs.functions.ts",
  "dashboard.functions.ts", "security.functions.ts", "auth.functions.ts",
  "username.functions.ts", "require-auth.ts", "resolve-destination.ts",
];

const GUARD_LIBS = ["security.functions.ts", "auth.functions.ts", "require-auth.ts"];

function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function cpDir(srcDir, destDir, filter = () => true) {
  if (!fs.existsSync(srcDir)) return;
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, ent.name);
    const d = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      cpDir(s, d, filter);
    } else if (filter(s)) {
      cp(s, d);
    }
  }
}

function rewrite(content, appKind) {
  let s = content;
  s = s.replace(/@\/components\/ui\//g, "@shared/ui/");
  s = s.replace(/@\/components\/common\//g, "@shared/ui/common/");
  s = s.replace(/@\/components\/mobile\//g, "@shared/ui/mobile/");
  s = s.replace(/@\/integrations\/supabase\//g, "@shared/supabase/");
  s = s.replace(/@\/lib\/utils/g, "@shared/utils");
  s = s.replace(/@\/features\/shared/g, "@shared/utils/formatters");
  s = s.replace(/@\/hooks\//g, "@shared/ui/hooks/");
  s = s.replace(/from "@tanstack\/react-start"/g, 'from "@tanstack/react-router"');
  s = s.replace(/import \{ useServerFn \}[^\n]+\n/g, "");
  s = s.replace(/useServerFn\([^)]+\)/g, "");
  s = s.replace(/@\/lib\/([a-z0-9-]+)\.functions/g, "@/api/$1");
  s = s.replace(/@\/features\/family-core\/scan-receipt\.functions/g, "@/api/scan-receipt");
  if (appKind === "family") {
    s = s.replace(/@\/features\/security-core/g, "@/features/security-core");
  }
  s = s.replace(/@\/assets\/security-hero\.jpg/g, '""');
  s = s.replace(/head:\s*\(\)\s*=>\s*\(\{[^}]*meta:[^}]*\}\),?\s*/gs, "");
  return s;
}

function writeRewritten(srcPath, destPath, appKind) {
  const raw = fs.readFileSync(srcPath, "utf8");
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, rewrite(raw, appKind));
}

function convertServerFnToApi(srcPath, destPath) {
  let s = fs.readFileSync(srcPath, "utf8");
  s = s.replace(/import \{ createServerFn \} from "@tanstack\/react-start";\n/g, "");
  s = s.replace(/import \{ requireSupabaseAuth \} from "@\/integrations\/supabase\/auth-middleware";\n/g,
    'import { supabase } from "@shared/supabase/client";\nimport { requireUser } from "@shared/supabase/auth";\n');
  s = s.replace(/@\/integrations\/supabase\//g, "@shared/supabase/");
  s = s.replace(/export const (\w+) = createServerFn\(\{ method: "[^"]+" \}\)\s*\.middleware\(\[requireSupabaseAuth\]\)\s*\.inputValidator\([^)]+\)\s*\.handler\(async \(\{ data, context \}\) => \{/g,
    "export async function $1(data: Parameters<typeof $1>[0] extends never ? never : never) {\n  const { supabase, userId } = await requireUser();\n");
  // Fallback simpler pattern - manual files may need fix
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, s);
}

// --- shared-supabase ---
cp(path.join(ROOT, "src/integrations/supabase/types.ts"),
  path.join(ROOT, "packages/shared-supabase/src/types.ts"));
cp(path.join(ROOT, "src/integrations/supabase/client.ts"),
  path.join(ROOT, "packages/shared-supabase/src/client.ts"));

// --- shared-utils ---
cp(path.join(ROOT, "src/lib/utils.ts"), path.join(ROOT, "packages/shared-utils/src/utils.ts"));
cpDir(path.join(ROOT, "src/features/shared"), path.join(ROOT, "packages/shared-utils/src/formatters"));

// --- shared-ui ---
cpDir(path.join(ROOT, "src/components/ui"), path.join(ROOT, "packages/shared-ui/src/ui"));
cpDir(path.join(ROOT, "src/components/common"), path.join(ROOT, "packages/shared-ui/src/common"));
cpDir(path.join(ROOT, "src/components/mobile"), path.join(ROOT, "packages/shared-ui/src/mobile"));
for (const h of ["use-auth.tsx", "use-theme.tsx", "use-mobile.tsx", "use-easy-read.tsx"]) {
  cp(path.join(ROOT, `src/hooks/${h}`), path.join(ROOT, `packages/shared-ui/src/hooks/${h}`));
}
cp(path.join(ROOT, "src/components/PagePendingSkeleton.tsx"),
  path.join(ROOT, "packages/shared-ui/src/PagePendingSkeleton.tsx"));

// Fix hooks imports in shared-ui
for (const f of fs.readdirSync(path.join(ROOT, "packages/shared-ui/src/hooks"))) {
  const p = path.join(ROOT, "packages/shared-ui/src/hooks", f);
  let c = fs.readFileSync(p, "utf8");
  c = c.replace(/@\/integrations\/supabase\//g, "@shared/supabase/");
  c = c.replace(/@\/lib\//g, "@/api/");
  fs.writeFileSync(p, c);
}

// Fix ui cn imports
function fixUiDir(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) fixUiDir(p);
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) {
      let c = fs.readFileSync(p, "utf8");
      if (c.includes("@/lib/utils")) {
        c = c.replace(/@\/lib\/utils/g, "@shared/utils");
        fs.writeFileSync(p, c);
      }
    }
  }
}
fixUiDir(path.join(ROOT, "packages/shared-ui/src"));

// --- family app ---
cpDir(path.join(ROOT, "src/features/family-core"), path.join(ROOT, "apps/family/src/features/family-core"));
cpDir(path.join(ROOT, "src/features/community"), path.join(ROOT, "apps/family/src/features/community"));
cpDir(path.join(ROOT, "src/features/security-core"), path.join(ROOT, "apps/family/src/features/security-core"));

for (const r of FAMILY_ROUTES) {
  const src = path.join(ROOT, "src/routes", r);
  if (fs.existsSync(src)) {
    writeRewritten(src, path.join(ROOT, "apps/family/src/routes", r), "family");
  }
}

for (const lib of FAMILY_LIBS) {
  const src = path.join(ROOT, "src/lib", lib);
  if (fs.existsSync(src)) {
    const apiName = lib.replace(".functions.ts", ".ts").replace("require-auth.ts", "require-auth.ts").replace("resolve-destination.ts", "resolve-destination.ts");
    cp(src, path.join(ROOT, "apps/family/src/api", apiName));
  }
}
cp(path.join(ROOT, "src/features/family-core/scan-receipt.functions.ts"),
  path.join(ROOT, "apps/family/src/api/scan-receipt.ts"));

// family hooks
cp(path.join(ROOT, "src/hooks/use-family-context.tsx"), path.join(ROOT, "apps/family/src/hooks/use-family-context.tsx"));
cp(path.join(ROOT, "src/hooks/use-notifications.tsx"), path.join(ROOT, "apps/family/src/hooks/use-notifications.tsx"));

// --- guard app ---
cpDir(path.join(ROOT, "src/features/security-core"), path.join(ROOT, "apps/guard/src/features/security-core"));
cpDir(path.join(ROOT, "src/features/security-ops"), path.join(ROOT, "apps/guard/src/features/security-ops"));

for (const r of GUARD_ROUTES) {
  const src = path.join(ROOT, "src/routes", r);
  if (fs.existsSync(src)) {
    writeRewritten(src, path.join(ROOT, "apps/guard/src/routes", r), "guard");
  }
}

for (const lib of GUARD_LIBS) {
  const src = path.join(ROOT, "src/lib", lib);
  if (fs.existsSync(src)) {
    cp(src, path.join(ROOT, "apps/guard/src/api", lib.replace(".functions.ts", ".ts")));
  }
}

// styles
cp(path.join(ROOT, "src/styles.css"), path.join(ROOT, "apps/family/src/styles.css"));
cp(path.join(ROOT, "src/styles.css"), path.join(ROOT, "apps/guard/src/styles.css"));

console.log("migrate-monorepo: copy + rewrite done");
