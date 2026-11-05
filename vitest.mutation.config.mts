import { defineConfig } from 'vitest/config';

/**
 * Vitest config used only by Stryker. Framework-free TypeScript (data/util libraries)
 * runs under Node here; Angular component specs are excluded on purpose.
 */
export default defineConfig({
  test: {
    include: [
      'packages/**/data*/src/**/*.spec.ts',
      'packages/**/util*/src/**/*.spec.ts',
    ],
    environment: 'node',
    globals: true,
    passWithNoTests: true,
  },
});
