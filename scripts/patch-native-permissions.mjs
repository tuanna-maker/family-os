/**
 * Patches iOS Info.plist and Android AndroidManifest.xml after `cap add`.
 * Usage: node scripts/patch-native-permissions.mjs family|guard
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function patchPlistUrlScheme(appDir, scheme) {
  const plistPath = path.join(appDir, "ios", "App", "App", "Info.plist");
  if (!fs.existsSync(plistPath)) return;
  let xml = fs.readFileSync(plistPath, "utf8");
  if (xml.includes("CFBundleURLTypes")) return;
  const block = `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLName</key>
\t\t\t<string>${scheme}</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${scheme}</string>
\t\t\t</array>
\t\t</dict>
\t</array>`;
  xml = xml.replace("</dict>\n</plist>", `${block}\n</dict>\n</plist>`);
  fs.writeFileSync(plistPath, xml);
  console.log(`Added URL scheme ${scheme} to ${plistPath}`);
}

const SCHEMES = { family: "vn.unicom.stos.family", guard: "vn.unicom.stos.guard" };

const IOS_KEYS = {
  family: {
    NSCameraUsageDescription: "Chụp ảnh hóa đơn và quét mã.",
    NSPhotoLibraryUsageDescription: "Chọn ảnh kỷ niệm gia đình.",
    NSPhotoLibraryAddUsageDescription: "Lưu ảnh vào thư viện.",
    NSUserNotificationsUsageDescription: "Nhận thông báo từ ban quản lý và gia đình.",
  },
  guard: {
    NSCameraUsageDescription: "Quét mã QR khi vào ca / ra ca.",
    NSLocationWhenInUseUsageDescription: "Ghi vị trí khi tuần tra.",
    NSLocationAlwaysAndWhenInUseUsageDescription: "Theo dõi tuần tra trong ca trực.",
    NSUserNotificationsUsageDescription: "Nhận cảnh báo SOS và sự cố.",
  },
};

const ANDROID_PERMS = {
  family: [
    "android.permission.CAMERA",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.POST_NOTIFICATIONS",
  ],
  guard: [
    "android.permission.CAMERA",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_LOCATION",
  ],
};

function patchPlist(appDir, keys) {
  const plistPath = path.join(appDir, "ios", "App", "App", "Info.plist");
  if (!fs.existsSync(plistPath)) {
    console.warn(`Skip iOS: ${plistPath} not found`);
    return;
  }
  let xml = fs.readFileSync(plistPath, "utf8");
  for (const [key, value] of Object.entries(keys)) {
    const block = `\t<key>${key}</key>\n\t<string>${value}</string>`;
    if (xml.includes(`<key>${key}</key>`)) continue;
    xml = xml.replace("</dict>\n</plist>", `${block}\n</dict>\n</plist>`);
  }
  fs.writeFileSync(plistPath, xml);
  console.log(`Patched ${plistPath}`);
}

function patchManifest(appDir, perms) {
  const manifestPath = path.join(appDir, "android", "app", "src", "main", "AndroidManifest.xml");
  if (!fs.existsSync(manifestPath)) {
    console.warn(`Skip Android: ${manifestPath} not found`);
    return;
  }
  let xml = fs.readFileSync(manifestPath, "utf8");
  for (const perm of perms) {
    const line = `    <uses-permission android:name="${perm}" />`;
    if (xml.includes(perm)) continue;
    xml = xml.replace("<application", `${line}\n\n    <application`);
  }
  fs.writeFileSync(manifestPath, xml);
  console.log(`Patched ${manifestPath}`);
}

const app = process.argv[2];
if (!app || !IOS_KEYS[app]) {
  console.error("Usage: node scripts/patch-native-permissions.mjs family|guard");
  process.exit(1);
}

const appDir = path.join(ROOT, "apps", app);
patchPlist(appDir, IOS_KEYS[app]);
patchPlistUrlScheme(appDir, SCHEMES[app]);
patchManifest(appDir, ANDROID_PERMS[app]);
