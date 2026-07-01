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
  {
    rules: {
      // Next 16's React-Compiler-readiness rule. It fires on the idiomatic SSR patterns
      // we use deliberately — setMounted(true) for hydration safety, restoring
      // localStorage/collapse state on mount, and hydrating server data into local
      // state. These are correct here, so keep it as a warning (visible, non-blocking)
      // rather than contorting working code. Revisit if we adopt the React Compiler.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
