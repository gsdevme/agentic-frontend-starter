/** @type {import('dependency-cruiser').IConfiguration} */
// Second, independent opinion on the import graph (ESLint boundaries are the first).
// Run: pnpm nx run workspace:depcruise  (also in CI). Graph: pnpm depcruise:graph
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Cycles make modules impossible to reason about in isolation.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      comment: 'Dead files. Delete them or wire them in.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // dotfiles
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)(babel|webpack|vite|vitest|playwright|stryker)\\.config\\.(js|cjs|mjs|ts|mts)$',
          '^apps/[^/]+/src/(main|main\\.server|server)\\.ts$',
          '^(packages|tools)/.+/src/index\\.ts$', // library public entrypoints
          '^packages/shared/design-tokens/src/',
          '^tools/workspace-plugin/src/generators/.*/files/',
        ],
      },
      to: {},
    },
    {
      name: 'features-are-leaves',
      severity: 'error',
      comment:
        'A feature may only be reached by the shell via a lazy route, never imported by another library.',
      from: { path: '^packages/', pathNot: '^packages/[^/]+/feature-' },
      to: { path: '^packages/[^/]+/feature-' },
    },
    {
      name: 'no-feature-to-feature',
      severity: 'error',
      comment:
        'Features do not import each other; share code through type:ui/data/util libraries.',
      from: { path: '^packages/([^/]+)/(feature-[^/]+)/' },
      to: { path: '^packages/[^/]+/feature-', pathNot: '^packages/$1/$2/' },
    },
    {
      name: 'no-deep-imports',
      severity: 'error',
      comment: 'Import libraries through their public index only.',
      from: { path: '^(apps|packages)/' },
      to: {
        path: '^packages/.+/src/lib/',
        pathNot: '^packages/([^/]+)/([^/]+)/src/lib/.+',
      },
    },
    {
      name: 'ui-has-no-data-access',
      severity: 'error',
      comment:
        'Design-system components are presentational; data access lives in type:data libraries.',
      from: { path: '^packages/shared/ui/' },
      to: {
        path: [
          '^packages/[^/]+/data',
          '@angular/common/http',
          'rxjs/ajax',
          'rxjs/fetch',
        ],
      },
    },
    {
      name: 'no-server-only-in-browser-code',
      severity: 'error',
      comment:
        'Node built-ins and the SSR engine may only be referenced from server.ts.',
      from: { path: '^(apps|packages)/.+\\.ts$', pathNot: '/server\\.ts$' },
      to: { path: ['^node:', '^express$', '^@angular/ssr/node'] },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment: 'Runtime code may not import devDependencies.',
      from: {
        path: '^(apps|packages)/',
        pathNot: [
          '\\.(spec|test|stories)\\.ts$',
          '/test-setup\\.ts$',
          '^apps/[^/]+-e2e/',
          '\\.config\\.(mjs|cjs|mts|ts)$',
          '/build\\.mjs$',
        ],
      },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules', 'dist', '\\.nx'] },
    exclude: {
      path: '(\\.spec\\.ts$|\\.test\\.ts$|/files/|eslint[.a-z]*\\.mjs$)',
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
      dot: { collapsePattern: '^(apps|packages)/[^/]+/[^/]+' },
    },
  },
};
