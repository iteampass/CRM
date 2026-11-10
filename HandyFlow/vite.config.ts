import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  // Server secrets stay in process.env; only VITE_* values reach browser code.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
  return {
    server: { host: "0.0.0.0", port: 3000, strictPort: true },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "entities/lib/decode.js": path.resolve(import.meta.dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(import.meta.dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(import.meta.dirname, "node_modules/entities"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
      tanstackStart({ server: { entry: "server" }, importProtection: { behavior: "error", client: { files: ["**/server/**"], specifiers: ["server-only"] } } }),
      ...(command === "build" ? [nitro()] : []),
     // ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
      react(),
    ],
  };
});
