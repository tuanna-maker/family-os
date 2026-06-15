const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const localModules = path.resolve(projectRoot, "node_modules");
const monorepoModules = path.resolve(monorepoRoot, "node_modules");

function resolvePkg(name) {
  const local = path.join(localModules, name);
  if (fs.existsSync(path.join(local, "package.json"))) return local;
  const root = path.join(monorepoModules, name);
  if (fs.existsSync(path.join(root, "package.json"))) return root;
  return local;
}

process.env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT ?? "./app";
process.env.EXPO_ROUTER_IMPORT_MODE =
  process.env.EXPO_ROUTER_IMPORT_MODE ?? "lazy";

const config = getDefaultConfig(projectRoot);

// Symlink mobile/*/node_modules → repo root confuses Metro's file watcher.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  // Guard nested deps only — do not block this app's workspace node_modules.
  /mobile\/guard\/node_modules\/.*/,
];

config.projectRoot = projectRoot;
config.watchFolders = [
  monorepoRoot,
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(monorepoRoot, "apps/family/src"),
];
config.resolver.nodeModulesPaths = [localModules, monorepoModules];
config.resolver.extraNodeModules = {
  "metro-runtime": resolvePkg("metro-runtime"),
  "lucide-react-native": resolvePkg("lucide-react-native"),
  "expo-blur": resolvePkg("expo-blur"),
};
config.resolver.alias = {
  "@": path.resolve(monorepoRoot, "apps/family/src"),
  "@mobile/api/avatars": path.resolve(projectRoot, "src/api/avatars.ts"),
  "@mobile/api": path.resolve(monorepoRoot, "apps/family/src/api"),
  "@mobile": path.resolve(projectRoot, "src"),
  "@shared/utils/security-status-notify": path.resolve(
    monorepoRoot,
    "packages/shared-utils/src/security-status-notify.ts",
  ),
  "@shared/supabase/profile-locale": path.resolve(
    monorepoRoot,
    "packages/shared-supabase/src/profile-locale.ts",
  ),
  react: path.resolve(monorepoModules, "react"),
  "react-native": path.resolve(monorepoModules, "react-native"),
  "expo-router/entry": path.resolve(monorepoModules, "expo-router/entry.js"),
};

module.exports = config;
