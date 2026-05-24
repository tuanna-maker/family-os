import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "packages/shared-ui/src");

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(ent.name)) {
      let s = fs.readFileSync(p, "utf8");
      const n = s;
      const dirName = path.basename(path.dirname(p));
      if (dirName === "ui") {
        s = s.replace(/from "@\/components\/ui\/([^"]+)"/g, 'from "./$1"');
      } else {
        const relUi = path.relative(path.dirname(p), path.join(ROOT, "ui")).replace(/\\/g, "/");
        const relCommon = path.relative(path.dirname(p), path.join(ROOT, "common")).replace(/\\/g, "/");
        s = s.replace(/from "@\/components\/ui\//g, `from "${relUi}/`);
        if (relCommon && relCommon !== "") {
          s = s.replace(/from "@\/components\/common\//g, `from "${relCommon}/`);
        }
      }
      s = s.replace(/from "@\/hooks\//g, 'from "../hooks/');
      s = s.replace(/from "@\/lib\/utils"/g, 'from "@shared/utils/utils"');
      if (s !== n) fs.writeFileSync(p, s);
    }
  }
}

walk(ROOT);
console.log("fix-shared-ui-imports done");
