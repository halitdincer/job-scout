import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'server/**/*.ts'],
      exclude: ['src/index.ts', 'server/index.ts', 'server/static.ts'],
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
