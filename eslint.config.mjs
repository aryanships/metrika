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
    // Non-app reference/planning content:
    "plan/**",
    // Generated Prisma contract artifacts:
    "prisma/schema.d.ts",
    "prisma/schema.json",
    "migrations/**",
    // Agent skill/instruction files:
    ".agents/**",
  ]),
]);

export default eslintConfig;
