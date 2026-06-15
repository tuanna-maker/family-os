const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

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
  /mobile\/[^/]+\/node_modules\/.*/,
];

config.projectRoot = projectRoot;
config.watchFolders = [
  monorepoRoot,
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(monorepoRoot, "apps/family/src"),
];
const monorepoModules = path.resolve(monorepoRoot, "node_modules");

config.resolver.nodeModulesPaths = [monorepoModules, path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  "metro-runtime": path.resolve(monorepoModules, "metro-runtime"),
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
