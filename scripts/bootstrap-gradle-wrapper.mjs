/**
 * Downloads gradle-wrapper.jar if missing (Capacitor scaffold omits binary in some environments).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRAPPER_URL =
  "https://github.com/gradle/gradle/raw/v8.2.1/gradle/wrapper/gradle-wrapper.jar";

for (const app of ["family", "guard"]) {
  const jarPath = path.join(ROOT, "apps", app, "android", "gradle", "wrapper", "gradle-wrapper.jar");
  if (fs.existsSync(jarPath)) {
    console.log(`OK ${jarPath}`);
    continue;
  }
  console.log(`Downloading gradle-wrapper.jar → ${jarPath}`);
  const res = await fetch(WRAPPER_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  fs.mkdirSync(path.dirname(jarPath), { recursive: true });
  fs.writeFileSync(jarPath, Buffer.from(await res.arrayBuffer()));
  console.log(`Saved ${jarPath}`);
}
