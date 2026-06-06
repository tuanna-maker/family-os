const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

process.env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT ?? "./src/app";
process.env.EXPO_ROUTER_IMPORT_MODE =
  process.env.EXPO_ROUTER_IMPORT_MODE ?? "lazy";

const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [
  path.resolve(monorepoRoot, "packages/shared-supabase"),
  path.resolve(monorepoRoot, "apps/guard/src"),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.alias = {
  "@": path.resolve(monorepoRoot, "apps/guard/src"),
  "@guard/api": path.resolve(monorepoRoot, "apps/guard/src/api"),
  "@mobile": path.resolve(projectRoot, "src"),
  "@expo/ui/jetpack-compose": path.resolve(projectRoot, "src/shims/expo-ui-jetpack-compose.tsx"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  react: path.resolve(projectRoot, "node_modules/react"),
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
