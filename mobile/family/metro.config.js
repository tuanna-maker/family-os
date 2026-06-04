const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

process.env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT ?? "./app";
process.env.EXPO_ROUTER_IMPORT_MODE =
  process.env.EXPO_ROUTER_IMPORT_MODE ?? "lazy";

const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [monorepoRoot, path.resolve(monorepoRoot, "apps/family/src")];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.alias = {
  "@": path.resolve(monorepoRoot, "apps/family/src"),
  "@mobile/api": path.resolve(monorepoRoot, "apps/family/src/api"),
  "@mobile": path.resolve(projectRoot, "src"),
};

module.exports = config;
