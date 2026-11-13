// Shared ESLint config for the non-Next packages (apps/widget, packages/*).
// apps/web has its own eslint.config.mjs with the Next.js rules.
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**", "apps/web/**"]),
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);
