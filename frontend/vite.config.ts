import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Built assets are copied into Spring Boot's classpath:/static root.
// In dev, Vite serves the SPA and proxies API calls to Spring on :8080.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    manifest: false,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8080",
    },
  },
});
