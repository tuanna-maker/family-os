/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  process.env.EXPO_ROUTER_APP_ROOT = "./src/app";
  process.env.EXPO_ROUTER_IMPORT_MODE = "lazy";

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return {
    ...config,
    name: "STOS Guard",
    slug: "guard",
    extra: {
      ...config.extra,
      supabaseUrl: supabaseUrl || config.extra?.supabaseUrl,
      supabaseAnonKey: supabaseAnonKey || config.extra?.supabaseAnonKey,
      authRedirectUrl:
        process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? "vn.unicom.stos.guardrn://auth",
      pilotPrefill: process.env.EXPO_PUBLIC_PILOT_PREFILL !== "false",
      eas: {
        ...config.extra?.eas,
        projectId:
          process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? config.extra?.eas?.projectId,
      },
    },
  };
};
