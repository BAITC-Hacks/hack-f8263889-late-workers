import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";

import { authMock } from "./dev/authMock.ts";

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useAuthMocks =
    command === "serve" &&
    !isPreview &&
    mode === "development" &&
    (env.AUTH_MOCKS ?? "true") === "true";

  return {
    plugins: [react(), tailwindcss(), useAuthMocks && authMock()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
