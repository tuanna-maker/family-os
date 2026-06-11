#!/usr/bin/env node
/**
 * Patch Expo iOS native project for monorepo dev (Metro localhost, path-with-spaces).
 * Usage: node scripts/patch-expo-ios-dev.mjs mobile/guard 8082
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRel = process.argv[2] ?? "mobile/guard";
const port = Number(process.argv[3] ?? "8082");
const iosDir = path.join(ROOT, appRel, "ios");

if (!fs.existsSync(iosDir)) {
  console.error(`[patch-expo-ios-dev] missing ${iosDir} — run expo prebuild first`);
  process.exit(1);
}

function walk(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = walk(full, name);
      if (hit) return hit;
    } else if (entry.name === name) return full;
  }
  return null;
}

const appDelegate = walk(iosDir, "AppDelegate.swift");
if (appDelegate) {
  let src = fs.readFileSync(appDelegate, "utf8");
  const bundleBlock = `  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return URL(string: "http://127.0.0.1:${port}/index.bundle?platform=ios&dev=true&minify=false")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }`;

  if (!src.includes(`127.0.0.1:${port}/index.bundle`)) {
    src = src.replace(
      /override func sourceURL\(for bridge: RCTBridge\) -> URL\? \{[\s\S]*?\n  \}/,
      `override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }`,
    );
    src = src.replace(
      /override func bundleURL\(\) -> URL\? \{[\s\S]*?\n  \}/,
      bundleBlock.replace(/  override func sourceURL[\s\S]*?\n\n  /, ""),
    );
    if (!src.includes(`127.0.0.1:${port}/index.bundle`)) {
      src = src.replace(
        /override func bundleURL\(\) -> URL\? \{[\s\S]*?\n  \}/,
        `  override func bundleURL() -> URL? {
#if DEBUG
    return URL(string: "http://127.0.0.1:${port}/index.bundle?platform=ios&dev=true&minify=false")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }`,
      );
    }
    fs.writeFileSync(appDelegate, src);
    console.log(`[patch-expo-ios-dev] AppDelegate → 127.0.0.1:${port}`);
  }
}

const infoPlist = walk(iosDir, "Info.plist");
if (infoPlist && !infoPlist.includes("/Pods/")) {
  let plist = fs.readFileSync(infoPlist, "utf8");
  if (!plist.includes("RCTPackagerHost")) {
    plist = plist.replace(
      "<key>NSAppTransportSecurity</key>",
      `<key>RCTPackagerHost</key>
    <string>127.0.0.1</string>
    <key>RCTPackagerPort</key>
    <integer>${port}</integer>
    <key>NSAppTransportSecurity</key>`,
    );
  } else {
    plist = plist.replace(
      /<key>RCTPackagerPort<\/key>\s*<integer>\d+<\/integer>/,
      `<key>RCTPackagerPort</key>\n    <integer>${port}</integer>`,
    );
  }
  fs.writeFileSync(infoPlist, plist);
  console.log(`[patch-expo-ios-dev] Info.plist packager port ${port}`);
}

const podfile = path.join(iosDir, "Podfile");
if (fs.existsSync(podfile)) {
  let pf = fs.readFileSync(podfile, "utf8");
  const patch = `
    installer.pods_project.targets.each do |target|
      target.shell_script_build_phases.each do |phase|
        next unless phase.shell_script&.include?("get-app-config-ios.sh")
        phase.shell_script = 'bash "\${PODS_TARGET_SRCROOT}/../scripts/get-app-config-ios.sh"'
      end
    end`;
  if (!pf.includes("get-app-config-ios.sh")) {
    pf = pf.replace(
      /post_install do \|installer\|/,
      `post_install do |installer|${patch}`,
    );
    fs.writeFileSync(podfile, pf);
    console.log("[patch-expo-ios-dev] Podfile get-app-config patch");
  }
}

const constScript = path.join(ROOT, "node_modules/expo-constants/scripts/get-app-config-ios.sh");
if (fs.existsSync(constScript)) {
  let sh = fs.readFileSync(constScript, "utf8");
  if (sh.includes("basename $PROJECT_DIR") && !sh.includes('basename "$PROJECT_DIR"')) {
    sh = sh.replace(/basename \$PROJECT_DIR/g, 'basename "$PROJECT_DIR"');
    fs.writeFileSync(constScript, sh);
    console.log("[patch-expo-ios-dev] expo-constants path quoting");
  }
}

const xcodeEnvLocal = path.join(iosDir, ".xcode.env.local");
const nodeBin = process.execPath;
fs.writeFileSync(
  xcodeEnvLocal,
  `export NODE_BINARY=${nodeBin}\nexport REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1\n`,
);
console.log("[patch-expo-ios-dev] .xcode.env.local");

for (const entry of fs.readdirSync(iosDir)) {
  if (!entry.endsWith(".xcodeproj")) continue;
  const pbx = path.join(iosDir, entry, "project.pbxproj");
  if (!fs.existsSync(pbx)) continue;
  let text = fs.readFileSync(pbx, "utf8");
  if (text.includes("RN_XCODE_SCRIPT")) continue;
  const broken =
    /\\n\\n`\\"\\$NODE_BINARY\\" --print \\"require\('path'\)\.dirname\(require\.resolve\('react-native\/package\.json'\)\) \\+ '\/scripts\/react-native-xcode\.sh'\\"`\\n\\n";/;
  if (!broken.test(text)) continue;
  text = text.replace(
    broken,
    '\\n\\nRN_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\")\\"\\nbash \\"$RN_XCODE_SCRIPT\\"\\n";',
  );
  fs.writeFileSync(pbx, text);
  console.log("[patch-expo-ios-dev] project.pbxproj bundle script quoting");
}
