import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              if (id.includes("/src/context/")) return "state";
              if (id.includes("/src/lib/")) return "lib";
              return;
            }

            if (id.includes("react-icons")) return "icons";
            if (id.includes("react-router-dom") || id.includes("react-router"))
              return "router";
            if (id.includes("axios")) return "http";
            return "vendor";
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };
});
