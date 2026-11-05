# Landmines

Things that are not obvious from the code and have already cost time. Add to this list when you
hit one; delete entries when the cause is fixed.

## Angular SSR rejects unknown hosts with 400

`Header "host" with value "x" is not allowed.` is Angular 22's SSRF protection, not a routing bug.
Build-time allow-list: `apps/shell/project.json` → `build.options.security.allowedHosts`
(`localhost`, `127.0.0.1` by default). Deployments add hostnames with
`NG_ALLOWED_HOSTS=app.example.com,*.internal.example.com`. Never `*` unless a trusted proxy
validates `Host`/`X-Forwarded-Host` upstream.

## Stale Nx project graph

Symptoms: `@nx/dependency-checks` says a package "is not used" although it is imported; a generator
"cannot find project"; `DB transaction error … FOREIGN KEY constraint failed`.
Fix: `pnpm nx reset`, rerun. Do not change `package.json` to satisfy a stale graph.

## `pnpm exec` changes directory

`pnpm exec eslint file.ts` runs from the nearest `package.json` — the repo root — so ESLint 9 uses the
root config and not the project's. Always lint through `pnpm nx run <project>:lint`; hooks call
`node_modules/.bin/eslint` with the project directory as cwd.

## Stryker sandboxes break Nx

Stryker copies the repo into `.stryker-tmp/sandbox-*`; Nx then sees duplicate projects. `.nxignore`
excludes it and `cleanTempDir: 'always'` is set. If you see "projects are defined in multiple
locations", `rm -rf .stryker-tmp`.

## Angular does not support TypeScript project references

Nx's default "TS solution" workspace (`tsconfig.json` with `references`, `pnpm-workspace.yaml`) is
incompatible with the Angular compiler. This repo uses the classic layout: `tsconfig.base.json`
with `paths`, no root `tsconfig.json`, libraries are not pnpm workspace packages.

## `vitest-angular` requires buildable libraries

`@nx/angular:library --unitTestRunner=vitest-angular` needs `--buildable`. The feature generator sets
this. There is no `vitest.config.*` per library; the Angular builder owns the config.

## `allowDefaultProject` cannot contain `**`

typescript-eslint's `projectService.allowDefaultProject` rejects globs with `**`. Files outside a
tsconfig (`*.mts` configs) are listed with single-level globs only.

## `@playwright/test` and `playwright-core` versions can skew for a few hours after a release

A minor release can be published before `playwright-core` is available. `pnpm.overrides` in
`package.json` pins all three Playwright packages to one version; bump them together.

## `templateAccessibility` config applies to every file unless scoped

`angular.configs.templateAccessibility` has no `files` key; spreading it unscoped makes ESLint try
to run template rules on `.ts` files and crash. `eslint.angular.mjs` scopes it to `**/*.html`.

## Angular v20 end of life: 2026-11-28

If legacy v20 apps are still running when you read this, they are unsupported. Freeze them behind the
reverse proxy; do not `ng update` them unless the human asks.
