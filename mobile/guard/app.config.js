/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  process.env.EXPO_ROUTER_APP_ROOT = "./src/app";
  process.env.EXPO_ROUTER_IMPORT_MODE = "lazy";
  return {
    ...config,
    name: "STOS Guard",
    slug: "guard",
  };
};
