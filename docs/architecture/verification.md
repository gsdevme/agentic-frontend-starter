# Verification pyramid

What each layer catches, in the order `pnpm verify` runs them. Cheap and local first.

| #   | Stage            | Tool                                                                                                                                                         | Catches                                                                                                                              |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | node version     | `scripts/verify/node-version.mjs`                                                                                                                            | Running Node, or `Dockerfile` base-image tags, on a different major from `.nvmrc`                                                    |
| 1   | spec gate        | `scripts/verify/spec-approved.mjs`                                                                                                                           | Work without an approved spec; plans pointing at drafts                                                                              |
| 2   | format           | prettier via `nx format:check`                                                                                                                               | Noise in diffs                                                                                                                       |
| 3   | lint             | ESLint 9 flat + typescript-eslint (type-aware) + angular-eslint strict + a11y + boundaries + check-file                                                      | Wrong layer imports, outdated Angular idioms, `any`, unsafe promises, oversized files, bad names, disabled tests, inline rule bypass |
| 4   | typecheck        | `ng-packagr` builds of every library (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strictTemplates`, extended diagnostics as errors) | Type holes, template errors                                                                                                          |
| 5   | unit             | Angular's Vitest builder (`@angular/build:unit-test`)                                                                                                        | Behaviour of components, services, pure logic; design-system conformance (`packages/shared/ui/src/conformance.spec.ts`)              |
| 6   | traceability     | `scripts/verify/require-req-ids.mjs`                                                                                                                         | Tests without a REQ id; approved REQs without a test                                                                                 |
| 7   | dependency graph | dependency-cruiser                                                                                                                                           | Cycles, orphans, features imported directly, Node APIs in browser code, devDependency leaks                                          |
| 8   | dead code        | Knip                                                                                                                                                         | Unused files, exports, dependencies agents leave behind                                                                              |
| 9   | tokens fresh     | `design-tokens:check-fresh`                                                                                                                                  | Hand-edited or stale generated token output                                                                                          |
| 10  | SSR build        | `@angular/build:application` with budgets                                                                                                                    | Bundle growth, server-unsafe code, prerender failures                                                                                |
| 11  | acceptance       | Playwright against `node dist/apps/shell/server/server.mjs` + axe-core                                                                                       | Spec scenarios end-to-end; SSR without JS; hydration errors; WCAG 2.2 AA                                                             |
| 12  | test weakening   | `scripts/verify/no-test-weakening.mjs`                                                                                                                       | Deleted/reduced tests; acceptance tests edited alongside implementation                                                              |
| CI  | mutation         | StrykerJS on `type:data`/`type:util` (incremental, `break: 70`)                                                                                              | Tests that pass without asserting behaviour                                                                                          |

`verify:quick` = stages 0–6 (seconds; used by hooks and pre-commit). `verify` = 0–12 on affected
projects. `verify:all` = everything on every project (CI, pre-push).

## Agent-side loop

- **PostToolUse** hook lints and formats each edited file; errors are fed back immediately.
- **Stop** hook runs `verify:quick`; the agent cannot end its turn with a red gate (one retry, then it
  escalates to the human with a system message).
- **spec-reviewer** subagent gives an independent read before the PR.
- CI is authoritative: it runs `verify:all` plus mutation testing on a clean checkout.

## What is deliberately not here (yet)

- Storybook: add when the first `packages/shared/ui` components land (`@storybook/angular` + `addon-vitest`), and extend `conformance.spec.ts` to require a `*.stories.ts` per component.
- Visual regression: `toHaveScreenshot` in e2e once the design system renders real components; pin the CI container image before enabling.
- Contract tests against the API: `openapi-typescript`/Orval generation in a `type:data` library, regenerated in CI with fail-on-diff.
