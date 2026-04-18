import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/services/**/*.ts", "src/lib/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/lib/pose/**",
        "src/lib/disclaimers.ts",
        "src/lib/utils.ts",
        // auth.ts is an Auth.js v5 config surface whose only behavior is
        // wiring NextAuth() + DrizzleAdapter. It is exercised at integration
        // boundaries (the sign-in flow in Playwright, Phase 14); unit tests
        // would mock everything it composes and prove nothing.
        "src/lib/auth.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 60,
        "src/services/**/*.ts": {
          lines: 85,
          functions: 85,
          statements: 85,
          branches: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
