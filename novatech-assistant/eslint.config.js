// Flat ESLint config. Enforces the AGENTS.md rule: no console.* in application code.
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "dist",
      "docs/**", // evidence snapshots (round1) intentionally contain anti-patterns
      "scripts/**", // CLI tooling where console output is the interface
      "src/web/**",
      "**/*.mjs",
      "**/*.js",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // AGENTS.md § Coding Standards rule 3: pino only, never console.
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
