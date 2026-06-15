module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": "../../apps/family/src",
            "@mobile/api/avatars": "./src/api/avatars",
            "@mobile/api": "../../apps/family/src/api",
            "@mobile": "./src",
          },
          extensions: [".tsx", ".ts", ".js", ".json"],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
