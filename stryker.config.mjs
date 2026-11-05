// Mutation testing: catches tests that pass without asserting anything meaningful.
// Scope: pure TypeScript in type:util / type:data libraries (component DOM tests are
// run through Angular's Vitest builder, which Stryker's runner does not drive).
// Run: pnpm mutate   — CI runs it on changed files with --incremental.
// Options reference: https://stryker-mutator.io/docs/stryker-js/configuration/
export default {
  packageManager: 'pnpm',
  plugins: ['@stryker-mutator/vitest-runner'],
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.mutation.config.mts' },
  mutate: [
    'packages/**/data/src/**/*.ts',
    'packages/**/util*/src/**/*.ts',
    'packages/**/data-*/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!**/*.d.ts',
  ],
  ignorePatterns: [
    'dist',
    '.nx',
    'coverage',
    'apps/*-e2e',
    'reports',
    'node_modules',
  ],
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
  incremental: true,
  incrementalFile: 'reports/stryker-incremental.json',
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/report.json' },
  thresholds: { high: 90, low: 75, break: 70 },
  timeoutMS: 20000,
  concurrency: 2,
};
