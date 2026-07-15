import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, "VITE_");
  const viteProcessEnv = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
  );

  return {
    root: dir,
    define: {
      ...viteProcessEnv,
      "import.meta.env.VITE_APP_TARGET": JSON.stringify("family"),
    },
  resolve: {
    alias: {
      "@": path.resolve(dir, "./src"),
      "@shared/ui": path.resolve(dir, "../../packages/shared-ui/src"),
      "@shared/supabase": path.resolve(dir, "../../packages/shared-supabase/src"),
      "@shared/utils": path.resolve(dir, "../../packages/shared-utils/src"),
    },
  },
  plugins: [react(), tailwindcss() as any],
  server: { port: 5173 },
  build: { outDir: path.resolve(dir, "dist"), emptyOutDir: true },
  };
});
