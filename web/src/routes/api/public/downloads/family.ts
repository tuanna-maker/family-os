import { createFileRoute } from "@tanstack/react-router";
import { MOBILE_APK } from "@/lib/mobile-apk";
import { serveApk } from "@/lib/serve-apk";

export const Route = createFileRoute("/api/public/downloads/family")({
  server: {
    handlers: {
      GET: async () => serveApk(MOBILE_APK.family.fileName),
    },
  },
});
