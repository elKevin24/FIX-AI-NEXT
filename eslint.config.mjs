import nextPlugin from "eslint-config-next";
import securityPlugin from "eslint-plugin-security";

/** @type {import('eslint').Linter.FlatConfig[]} */
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "build/**"],
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
