import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Enforce one-way dependency: src/ must never import from scripts/.
  // scripts/ may import from src/ (e.g. db, api, service layers).
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/scripts/**"],
              message: "src/ must not import from scripts/ — the dependency only flows scripts/ → src/.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
