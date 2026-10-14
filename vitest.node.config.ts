import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Node (non-browser) unit tests, kept separate from the Storybook browser
// project in vitest.config.ts. Run with `npm run test:node`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    name: "node",
    environment: "node",
    include: ["src/**/*.node.test.ts"],
  },
});
