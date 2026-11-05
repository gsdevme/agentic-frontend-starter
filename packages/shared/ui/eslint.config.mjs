import baseConfig from '../../../eslint.config.mjs';
import { angularConfig } from '../../../eslint.angular.mjs';

export default [
  ...angularConfig('ds'),
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
        },
      ],
    },
    languageOptions: { parser: await import('jsonc-eslint-parser') },
  },
];
