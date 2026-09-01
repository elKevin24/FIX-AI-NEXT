import nextPlugin from "eslint-config-next";
import securityPlugin from "eslint-plugin-security";

/** @type {import('eslint').Linter.FlatConfig[]} */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "src/generated/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "archify/**",
      "scripts/**",
    ],
  },
  ...nextPlugin,
  securityPlugin.configs.recommended,
  {
    rules: {
      "security/detect-object-injection": "off",
    },
  },
];

export default eslintConfig;
