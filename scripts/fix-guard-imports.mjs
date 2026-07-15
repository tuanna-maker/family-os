import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "apps/guard/src");

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(ent.name)) {
      let s = fs.readFileSync(p, "utf8");
      const n = s;
      s = s.replaceAll('@/components/ui/', '@shared/ui/ui/');
      s = s.replaceAll('@/components/mobile/', '@shared/ui/mobile/');
      s = s.replaceAll('@/hooks/use-auth', '@shared/ui/hooks/use-auth');
      s = s.replaceAll('@/lib/', '@/api/');
      if (s !== n) fs.writeFileSync(p, s);
    }
  }
}

walk(GUARD);
console.log("fix-guard-imports done");
