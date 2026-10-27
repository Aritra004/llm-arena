import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    ignores: [
      "infrastructure/database-environment.ts",
      "infrastructure/env.ts",
      "infrastructure/public-env.ts",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Read environment variables through infrastructure/env.ts or infrastructure/public-env.ts.",
        },
      ],
    },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "generated/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
