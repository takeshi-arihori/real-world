import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const bffProxyTarget =
    env.BFF_PROXY_TARGET ?? env.VITE_BFF_PROXY_TARGET ?? "http://localhost:3006";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 3005,
      host: true,
      proxy: {
        "/api": {
          changeOrigin: true,
          secure: false,
          target: bffProxyTarget,
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      passWithNoTests: true,
    },
  };
});
