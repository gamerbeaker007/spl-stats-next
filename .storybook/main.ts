import type { StorybookConfig } from "@storybook/nextjs";
import path from "path";
import { fileURLToPath } from "url";
import type { Configuration } from "webpack";
import webpack from "webpack";

// `__dirname` is not available in ESM modules; derive it from `import.meta.url`.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISMA_MOCK_PATH = path.resolve(__dirname, "prisma.mock.ts");
const NEXT_CACHE_MOCK_PATH = path.resolve(__dirname, "next-cache.mock.ts");

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  webpackFinal: async (webpackConfig: Configuration) => {
    webpackConfig.resolve = webpackConfig.resolve ?? {};

    // Node.js built-ins used by pg/pg-pool that can't be bundled for browser.
    // Server action modules are replaced by @storybook/nextjs but their
    // transitive Node.js-only imports still need to be stubbed.
    webpackConfig.resolve.fallback = {
      ...webpackConfig.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
      dns: false,
      crypto: false,
    };

    // Force any import of `@/lib/prisma` to the Storybook stub before module
    // resolution, so the real prisma module is never evaluated in the browser bundle.
    webpackConfig.plugins = webpackConfig.plugins ?? [];
    webpackConfig.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^@\/lib\/prisma$/, PRISMA_MOCK_PATH)
    );

    // Keep a direct alias as a second safety net for non-standard resolver paths.
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias as Record<string, string>),
      "@/lib/prisma": PRISMA_MOCK_PATH,
      "next/cache": NEXT_CACHE_MOCK_PATH,
    };

    console.log("STORYBOOK PRISMA MOCK:", PRISMA_MOCK_PATH);
    return webpackConfig;
  },
};

export default config;
