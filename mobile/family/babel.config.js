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
            "@mobile/api": "../../apps/family/src/api",
            "@mobile": "./src",
          },
          extensions: [".tsx", ".ts", ".js", ".json"],
        },
      ],
      function expoRouterEnvInline() {
        return {
          visitor: {
            MemberExpression(path, state) {
              const t = require("@babel/types");
              if (!path.get("object").matchesPattern("process.env")) return;
              const key = path.toComputedKey();
              if (!t.isStringLiteral(key)) return;
              if (key.value === "EXPO_ROUTER_APP_ROOT") {
                const filename = state.filename || "";
                const appRoot = filename.includes("node_modules")
                  ? "../../app"
                  : "./app";
                path.replaceWith(t.stringLiteral(appRoot));
              } else if (key.value === "EXPO_ROUTER_IMPORT_MODE") {
                path.replaceWith(t.stringLiteral("lazy"));
              }
            },
          },
        };
      },
    ],
  };
};
