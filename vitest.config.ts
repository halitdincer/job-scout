import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'server/**/*.ts'],
      exclude: ['src/index.ts', 'server/index.ts', 'server/static.ts', 'src/debug.ts', 'src/types.ts'],
      thresholds: { lines: 75, functions: 75, branches: 60, statements: 75 },
    },
  },
});
