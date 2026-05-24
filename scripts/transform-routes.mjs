import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function transform(content) {
  let s = content;
  s = s.replace(/@\/components\/ui\//g, "@shared/ui/");
  s = s.replace(/@\/components\/common\//g, "@shared/ui/common/");
  s = s.replace(/@\/components\/mobile\//g, "@shared/ui/mobile/");
  s = s.replace(/@\/integrations\/supabase\//g, "@shared/supabase/");
  s = s.replace(/@\/lib\/utils/g, "@shared/utils");
  s = s.replace(/@\/features\/shared/g, "@shared/utils/formatters");
  s = s.replace(/@\/hooks\//g, "@shared/ui/hooks/");
  s = s.replace(/@\/lib\/([a-z0-9-]+)\.functions/g, "@/api/$1");
  s = s.replace(/@\/features\/family-core\/scan-receipt\.functions/g, "@/api/scan-receipt");
  s = s.replace(/import \{ useServerFn \} from "@tanstack\/react-start";\n/g, "");

  const aliases = new Map();
  s = s.replace(/const (\w+) = useServerFn\((\w+)\);\n/g, (_, alias, fn) => {
    aliases.set(alias, fn);
    return "";
  });

  for (const [alias, fn] of aliases) {
    const re = new RegExp(`\\b${alias}\\(`, "g");
    s = s.replace(re, `${fn}(`);
  }

  s = s.replace(/\(\{\s*data:\s*(\{[^}]*\})\s*\}\)/g, "($1)");
  s = s.replace(/\(\{\s*data:\s*(\w+)\s*\}\)/g, "($1)");
  s = s.replace(/(\w+)\(\{\s*data:\s*\{/g, "$1({");
  s = s.replace(/\n\s*\},\s*\n\s*\}\),/g, "\n      }),");
  s = s.replace(/import securityHero[^\n]+\n/g, "");
  s = s.replace(/@shared\/ui\/hooks\/use-family-context/g, "@/hooks/use-family-context");
  s = s.replace(/,\s*\n\s*\}\),\s*\n(\s*onSuccess)/g, "\n    }),\n$1");
  return s;
}

function copyRoutes(names, destDir) {
  for (const r of names) {
    const src = path.join(ROOT, "src/routes", r);
    if (!fs.existsSync(src)) continue;
    fs.writeFileSync(path.join(destDir, r), transform(fs.readFileSync(src, "utf8")));
  }
}

const FAMILY = [
  "portal.tsx", "home.tsx", "gia-dinh.tsx", "dashboard.tsx", "con-cai.tsx",
  "cham-soc-ong-ba.tsx", "cham-soc-ong-ba.nhat-ky.tsx", "chi-tieu.tsx", "chi-tieu_.scan.tsx",
  "thuc-pham.tsx", "suc-khoe.tsx", "suc-khoe.quan-ly.tsx", "lich-gia-dinh.tsx",
  "ky-niem-gia-dinh.tsx", "quan-ly-giup-viec.tsx", "du-lich.tsx", "dich-vu.tsx",
  "qr-vao-ra.tsx", "bao-an.tsx", "thong-bao.tsx", "cai-dat.thong-bao.tsx",
  "cong-dong.tsx", "lien-he.tsx", "tai-khoan.tsx",
  "login.tsx", "forgot-password.tsx", "reset-password.tsx",
];

const GUARD = [
  "guard.tsx", "guard.index.tsx", "guard.check-in.tsx", "guard.check-out.tsx",
  "guard.schedule.tsx", "guard.patrol.tsx", "guard.requests.tsx", "guard.incident.tsx",
  "guard.notifications.tsx", "guard.account.tsx", "security.tsx", "security.index.tsx",
  "login.tsx",
];

copyRoutes(FAMILY, path.join(ROOT, "apps/family/src/routes"));
copyRoutes(GUARD, path.join(ROOT, "apps/guard/src/routes"));
// Keep guard security layout (no ConsoleShell)
const secPath = path.join(ROOT, "apps/guard/src/routes/security.tsx");
if (fs.existsSync(secPath)) {
  // already written manually — skip overwrite from monolith
}
console.log("transform-routes: family + guard routes refreshed");
