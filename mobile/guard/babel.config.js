module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": "../../apps/guard/src",
            "@guard/api": "../../apps/guard/src/api",
            "@mobile": "./src",
            "@shared/utils": "../../packages/shared-utils/src",
            "@shared/utils/security-status-notify": "../../packages/shared-utils/src/security-status-notify.ts",
          },
          extensions: [".tsx", ".ts", ".js", ".json"],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
