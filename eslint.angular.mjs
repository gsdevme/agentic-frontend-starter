// Shared Angular rule set. Imported by every Angular app and library config.
// Encodes the Angular v22 conventions from angular.dev/ai best-practices.md as
// hard errors so agents cannot drift to NgModules, decorators-for-inputs, *ngIf, etc.
import nx from '@nx/eslint-plugin';
import angular from 'angular-eslint';

/** @param {string} prefix selector prefix for this project (e.g. 'app', 'ds', '<scope>') */
export function angularConfig(prefix) {
  return [
    ...nx.configs['flat/angular'],
    ...nx.configs['flat/angular-template'],
    ...angular.configs.templateAccessibility.map((c) => ({
      ...c,
      files: ['**/*.html'],
    })),
    {
      files: ['**/*.ts'],
      rules: {
        '@angular-eslint/directive-selector': [
          'error',
          { type: 'attribute', prefix, style: 'camelCase' },
        ],
        '@angular-eslint/component-selector': [
          'error',
          { type: 'element', prefix, style: 'kebab-case' },
        ],
        // Modern Angular only.
        '@angular-eslint/prefer-standalone': 'error',
        '@angular-eslint/prefer-signals': 'error',
        '@angular-eslint/prefer-signal-model': 'error',
        '@angular-eslint/prefer-output-emitter-ref': 'error',
        '@angular-eslint/prefer-inject': 'error',
        '@angular-eslint/inject-at-top': 'error',
        '@angular-eslint/prefer-on-push-component-change-detection': 'error',
        '@angular-eslint/prefer-host-metadata-property': 'error',
        '@angular-eslint/no-inputs-metadata-property': 'error',
        '@angular-eslint/no-outputs-metadata-property': 'error',
        '@angular-eslint/no-queries-metadata-property': 'error',
        '@angular-eslint/no-developer-preview': 'error',
        '@angular-eslint/no-experimental': 'error',
        '@angular-eslint/no-forward-ref': 'error',
        '@angular-eslint/no-async-lifecycle-method': 'error',
        '@angular-eslint/no-lifecycle-call': 'error',
        '@angular-eslint/no-uncalled-signals': 'error',
        '@angular-eslint/computed-must-return': 'error',
        '@angular-eslint/reactive-context-must-read-signal': 'error',
        '@angular-eslint/no-implicit-take-until-destroyed': 'error',
        '@angular-eslint/use-injectable-provided-in': 'error',
        '@angular-eslint/use-component-view-encapsulation': 'error',
        '@angular-eslint/relative-url-prefix': 'error',
        '@angular-eslint/consistent-component-styles': ['error', 'string'],
        '@angular-eslint/component-max-inline-declarations': [
          'error',
          { template: 10, styles: 5, animations: 0 },
        ],
        '@angular-eslint/sort-lifecycle-methods': 'error',
      },
    },
    {
      files: ['**/*.html'],
      rules: {
        '@angular-eslint/template/prefer-control-flow': 'error',
        '@angular-eslint/template/prefer-self-closing-tags': 'error',
        '@angular-eslint/template/prefer-at-empty': 'error',
        '@angular-eslint/template/prefer-at-else': 'error',
        '@angular-eslint/template/prefer-built-in-pipes': 'error',
        '@angular-eslint/template/prefer-ngsrc': 'error',
        '@angular-eslint/template/no-call-expression': 'error',
        '@angular-eslint/template/no-any': 'error',
        '@angular-eslint/template/no-inline-styles': 'error',
        '@angular-eslint/template/no-interpolation-in-attributes': 'error',
        '@angular-eslint/template/no-duplicate-attributes': 'error',
        '@angular-eslint/template/no-empty-control-flow': 'error',
        '@angular-eslint/template/no-positive-tabindex': 'error',
        '@angular-eslint/template/no-autofocus': 'error',
        '@angular-eslint/template/button-has-type': 'error',
        '@angular-eslint/template/eqeqeq': 'error',
        '@angular-eslint/template/conditional-complexity': [
          'error',
          { maxComplexity: 4 },
        ],
        '@angular-eslint/template/cyclomatic-complexity': [
          'error',
          { maxComplexity: 10 },
        ],
        '@angular-eslint/template/use-track-by-function': 'off', // @for requires `track` already
        '@angular-eslint/template/require-switch-default': 'error',
      },
    },
  ];
}
