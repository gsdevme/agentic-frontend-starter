import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // Acceptance tests are the spec's oracle: keep them honest.
      'playwright/no-skipped-test': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/no-eval': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/expect-expect': 'error',
      'playwright/missing-playwright-await': 'error',
      // e2e files are allowed console for debugging artefacts; everything else from base applies.
      'no-restricted-syntax': 'off',
      'max-lines-per-function': 'off',
    },
  },
];
