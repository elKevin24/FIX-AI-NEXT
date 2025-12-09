import nextPlugin from "eslint-config-next";

/** @type {import('eslint').Linter.FlatConfig[]} */
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "build/**"],
  },
  ...nextPlugin,
];

export default eslintConfig;
