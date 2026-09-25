import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${root}$1` },
      { find: /^cloudflare:workers$/, replacement: `${root}tests/shims/cloudflare-workers.ts` },
      { find: /^next\/headers$/, replacement: `${root}tests/shims/next-headers.ts` },
      { find: /^next\/navigation$/, replacement: `${root}tests/shims/next-navigation.ts` },
      { find: /^next\/server$/, replacement: `${root}tests/shims/next-server.ts` },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/fetch-guard.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
