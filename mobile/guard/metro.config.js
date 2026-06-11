const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

process.env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT ?? "./src/app";
process.env.EXPO_ROUTER_IMPORT_MODE =
  process.env.EXPO_ROUTER_IMPORT_MODE ?? "lazy";

let config = getDefaultConfig(projectRoot);
const monorepoModules = path.resolve(monorepoRoot, "node_modules");

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
  monorepoModules,
  path.resolve(monorepoRoot, "packages/shared-supabase"),
  path.resolve(monorepoRoot, "apps/guard/src"),
];
config.resolver.nodeModulesPaths = [monorepoModules, path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  "metro-runtime": path.resolve(monorepoModules, "metro-runtime"),
};
config.resolver.alias = {
  "@": path.resolve(monorepoRoot, "apps/guard/src"),
  "@guard/api": path.resolve(monorepoRoot, "apps/guard/src/api"),
  "@mobile": path.resolve(projectRoot, "src"),
  "@expo/ui/jetpack-compose": path.resolve(projectRoot, "src/shims/expo-ui-jetpack-compose.tsx"),
  react: path.resolve(monorepoModules, "react"),
  "react-native": path.resolve(monorepoModules, "react-native"),
  "expo-router/entry": path.resolve(monorepoModules, "expo-router/entry"),
};

config = withNativeWind(config, { input: "./src/global.css" });

const routerRoot = "src/app";
const baseGetTransformOptions = config.transformer?.getTransformOptions;
config.transformer.getTransformOptions = async (
  entryPoints,
  transformOptions,
  getDependenciesOf,
) => {
  const base = baseGetTransformOptions
    ? await baseGetTransformOptions(entryPoints, transformOptions, getDependenciesOf)
    : { transform: { experimentalImportSupport: false, inlineRequires: false } };
  return {
    ...base,
    customTransformOptions: {
      ...(base.customTransformOptions ?? {}),
      routerRoot,
      asyncRoutes: "true",
    },
  };
};

module.exports = config;
