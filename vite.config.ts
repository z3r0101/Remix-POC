import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const basePath = process.env.BASE_PATH || "/"; // Default to root if BASE_PATH is not set

installGlobals();

export default defineConfig({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  base: basePath,
  plugins: [
    remix({
      ssr: true,
      basename: basePath,
    }),
    tsconfigPaths(),
  ],
  define: {
    "process.env.BASE_PATH": JSON.stringify(basePath), // Expose BASE_PATH
  },
});
