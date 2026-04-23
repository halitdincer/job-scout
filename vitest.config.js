import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["core/static/js/__tests__/**/*.test.js"],
    globals: false,
    coverage: {
      provider: "v8",
      include: ["core/static/js/**/*.js"],
      exclude: [
        "core/static/js/__tests__/**",
        "core/static/js/jobs.js",
      ],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
