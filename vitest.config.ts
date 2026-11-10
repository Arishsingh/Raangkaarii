import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // `server-only` throws outside a React Server build; tests import server code directly.
    alias: {
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
      // next-auth imports "next/server" with no extension, which plain Node
      // ESM cannot resolve; with next-auth bundled below, this alias fixes it.
      "next/server": "next/server.js",
    },
    server: { deps: { inline: ["next-auth"] } },
  },
});
