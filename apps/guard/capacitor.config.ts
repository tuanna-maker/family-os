import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "vn.unicom.stos.guard",
  appName: "STOS Guard",
  webDir: "dist",
  server: { androidScheme: "https" },
  ios: { contentInset: "always" },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0C1929",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
