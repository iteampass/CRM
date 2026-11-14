import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode, command }) => {
  const keys = [
    "CONTACT_EMAIL_TO", "CONTACT_EMAIL_FROM", "RESEND_API_KEY", "APP_URL",
    "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY", "OPENAI_MODEL",
  ];
  const env = loadEnv(mode, process.cwd(), keys);
  for (const key of keys) {
    if (process.env[key] === undefined && env[key] !== undefined) process.env[key] = env[key];
  }

  return {
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart({ server: { entry: "server" } }),
      react(),
      ...(command === "build" ? [nitro({})] : []),
    ],
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"] },
    server: { host: "::", port: 8080 },
  };
});
