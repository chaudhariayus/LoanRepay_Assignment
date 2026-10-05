import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.js"],
    // Points Prisma at TEST_DATABASE_URL; integration tests skip without it.
    setupFiles: ["tests/integration/setup.js"],
    // Hosted Postgres round trips are slower than unit tests.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
