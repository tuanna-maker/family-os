import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dir,
  resolve: {
    alias: {
      "@": path.resolve(dir, "./src"),
      "@shared/ui": path.resolve(dir, "../../packages/shared-ui/src"),
      "@shared/supabase": path.resolve(dir, "../../packages/shared-supabase/src"),
      "@shared/utils": path.resolve(dir, "../../packages/shared-utils/src"),
    },
  },
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: { outDir: path.resolve(dir, "dist"), emptyOutDir: true },
});
