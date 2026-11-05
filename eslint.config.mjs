// Root lint config. Every project extends this. Rules here are the mechanical
// half of docs/constitution.md — if a rule is in the constitution and can be
// linted, it is linted here rather than left to prose.
import nx from '@nx/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';

/**
 * Architecture: two tag dimensions.
 *   scope:<domain>  — who owns it. `shared` is cross-cutting and may only depend on shared.
 *   type:<kind>     — what it is. Dependencies flow strictly downward:
 *       app → feature → (ui | data) → util → tokens
 * New scopes are registered in docs/architecture/scopes.md and added to SCOPES below.
 */
const SCOPES = ['shell'];

const scopeConstraints = SCOPES.map((scope) => ({
  sourceTag: `scope:${scope}`,
  onlyDependOnLibsWithTags: [`scope:${scope}`, 'scope:shared'],
}));

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/coverage',
      '**/reports',
      '**/.stryker-tmp',
      '**/node_modules',
      '**/design-tokens/src/**', // generated
    ],
  },
  {
    // Agents may not switch rules off inline; exceptions go through a reviewed config change.
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mts', '**/*.mjs'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$', '^.*/eslint\\.angular\\.mjs$'],
          banTransitiveDependencies: true,
          checkDynamicDependenciesExceptions: [],
          depConstraints: [
            { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
            ...scopeConstraints,
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:feature', 'type:ui', 'type:data', 'type:util', 'type:tokens'],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: ['type:ui', 'type:data', 'type:util', 'type:tokens'],
            },
            { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:ui', 'type:util', 'type:tokens'] },
            { sourceTag: 'type:data', onlyDependOnLibsWithTags: ['type:data', 'type:util'] },
            { sourceTag: 'type:util', onlyDependOnLibsWithTags: ['type:util'] },
            { sourceTag: 'type:tokens', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'type:e2e', onlyDependOnLibsWithTags: ['type:util'] },
            { sourceTag: 'type:tooling', onlyDependOnLibsWithTags: ['type:tooling'] },
          ],
        },
      ],
    },
  },
  {
    // Type-aware linting for every TS file (each project has its own tsconfig).
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
      '@typescript-eslint/prefer-readonly': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    ignores: ['**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'],
    rules: {
      // Size and shape limits: small, cohesive units are cheaper for agents to read and review.
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
      complexity: ['error', 12],
      // Type discipline beyond tsconfig.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // No wildcard barrels: they hide the import graph from agents and from the boundary rule.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Wildcard re-exports (`export * from`) are banned. Export names explicitly so the public API is reviewable.',
        },
        {
          selector: "CallExpression[callee.object.name='console']",
          message: 'No console.* in application code. Use the logger from a `type:util` library.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src/lib/**', '../../**/src/**'],
              message: 'Deep imports are banned. Import a library only through its @starter/* alias (its public API).',
            },
            {
              group: ['rxjs/internal/*'],
              message: 'Import from rxjs public entry points only.',
            },
          ],
        },
      ],
    },
  },
  {
    // Process entrypoints are the only place console.* is allowed (no DI available yet).
    files: ['**/src/main.ts', '**/src/main.server.ts', '**/src/server.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Wildcard re-exports (`export * from`) are banned.',
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      // Tests may be longer, but each `it` must cite a requirement id (checked by scripts/verify/require-req-ids.mjs).
      'max-lines': ['error', { max: 600, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='only']",
          message: 'Focused tests (.only) may not be committed.',
        },
        {
          selector: "CallExpression[callee.property.name='skip']",
          message: 'Skipped tests may not be committed. Delete the test or fix it, and record the decision in the spec.',
        },
        {
          selector: "CallExpression[callee.name='xit'], CallExpression[callee.name='xdescribe'], CallExpression[callee.name='xtest']",
          message: 'Disabled tests may not be committed.',
        },
      ],
    },
  },
  {
    files: ['**/*'],
    ignores: ['**/*.md', '**/files/**'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.{ts,mts,js,mjs,html,css,json}': 'KEBAB_CASE',
        },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': ['error', { 'apps/**/': 'KEBAB_CASE', 'packages/**/': 'KEBAB_CASE' }],
      'check-file/no-index': 'off', // index.ts is the ONLY allowed barrel, at a library root
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts', '**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    rules: {},
  },
];
