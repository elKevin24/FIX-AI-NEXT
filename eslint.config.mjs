import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // 1. Ignorar carpetas generadas explícitamente primero
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "build/**"],
  },
  // 2. Extender la configuración de Next.js
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;