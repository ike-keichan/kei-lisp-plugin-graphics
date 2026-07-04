import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'html', 'lcov'],
      // Floors slightly below the measured values (2026-07: 95.8 / 91.5 /
      // 100 / 99.3) so regressions fail CI without making every small
      // refactor fight the last percent.
      thresholds: {
        statements: 94,
        branches: 90,
        functions: 100,
        lines: 98,
      },
    },
  },
});
