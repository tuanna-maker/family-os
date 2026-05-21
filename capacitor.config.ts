import type { CapacitorConfig } from "@capacitor/cli";

const devServer = process.env.CAP_SERVER_URL ?? "http://127.0.0.1:8080/guard";

const config: CapacitorConfig = {
  appId: "vn.stos.guard",
  appName: "STOS Guard",
  webDir: "capacitor-web",
  server: {
    url: devServer,
    cleartext: true,
    androidScheme: "http",
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
};

export default config;
