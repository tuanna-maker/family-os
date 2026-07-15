#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const content = `# This \`.xcode.env\` file is versioned and is used to source the environment
# used when running script phases inside Xcode.
# To customize your local environment, you can create an \`.xcode.env.local\`
# file that is not versioned.

# NODE_BINARY variable contains the PATH to the node executable.
#
# Customize the NODE_BINARY variable here.
# For example, to use nvm with brew, add the following line
# . "$(brew --prefix nvm)/nvm.sh" --no-use
export NODE_BINARY=$(command -v node)
`;

for (const rel of ["mobile/family/ios/.xcode.env", "mobile/guard/ios/.xcode.env"]) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.log(`${rel} skip (missing)`);
    continue;
  }
  fs.writeFileSync(file, content, "utf8");
  const normalized = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  fs.writeFileSync(file, normalized, "utf8");
  const after = fs.readFileSync(file);
  console.log(rel, "CRLF:", after.includes(0x0d));
}
