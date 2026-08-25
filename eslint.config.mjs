// Flat config, loaded by ESLint with no flag and no jiti (it is .mjs on purpose --
// eslint.config.ts would need --experimental-strip-types on every invocation).
// Typed linting is scoped to **/*.ts so this file is linted by core rules only and
// the type-aware parser never has to place a .mjs in a program.
import js from "@eslint/js";
import n from "eslint-plugin-n";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  // dist/ is the committed build output; the worktrees dir holds implementer checkouts.
  { ignores: ["dist/", ".claude/worktrees/"] },

  js.configs.recommended,

  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.recommendedTypeChecked],
    plugins: { n },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Zero runtime dependencies: only node: builtins and relative .ts siblings.
      // The regex form; the `group:` glob form false-positives on relative imports.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?![.]|node:)",
              message:
                "node: builtins and relative .ts imports only — the kit has zero runtime dependencies",
            },
          ],
        },
      ],
      "n/prefer-node-protocol": "error",
      "n/no-extraneous-import": "error",
      "n/no-missing-import": "error",
      "n/no-unpublished-import": "error",
      // In the strict preset, not in recommended. A non-null assertion in a
      // fail-closed hook turns a denial into a crash; guards are written out instead.
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
]);
