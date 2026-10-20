import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  const env = loadEnv(mode, projectRoot, "");
  const backendHost = env.HOST;
  const backendPort = Number(env.PORT);
  const frontendHost = env.FRONTEND_HOST;
  const frontendPort = Number(env.FRONTEND_PORT);
  if (!backendHost || !frontendHost ||
    !Number.isInteger(backendPort) || backendPort < 1 || backendPort > 65535 ||
    !Number.isInteger(frontendPort) || frontendPort < 1 || frontendPort > 65535) {
    throw new Error(`Set HOST, PORT, FRONTEND_HOST, and FRONTEND_PORT for Vite mode ${mode}.`);
  }

  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    envDir: projectRoot,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    plugins: [vue()],
    server: {
      host: frontendHost,
      port: frontendPort,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://${backendHost}:${backendPort}`,
        },
      },
    },
    build: {
      outDir: "dist",
    },
  };
});
