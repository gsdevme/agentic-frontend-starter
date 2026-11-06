# Constitution

Non-negotiable rules for this codebase. Each rule names the mechanism that enforces it; a rule with
no mechanism is a bug in this document, not a suggestion. Changing this file is a human decision
recorded in `docs/adr/`.

## 1. Specs before code

1.1 No feature work starts without an approved spec in `docs/superpowers/specs/` (`Status: approved`). — _feature generator, spec gate, path hook_
1.2 Requirements are numbered `REQ-<AREA>-NNN`, written in EARS form, and every one has at least one test. — _require-req-ids.mjs_
1.3 Approved specs are immutable to agents; changes produce a new dated spec. — _guard-paths hook_
1.4 Acceptance tests are derived from the spec before implementation and are human-owned afterwards. — _acceptance-author agent, guard-paths hook, no-test-weakening.mjs_

## 2. Structure

2.1 One deployable (`apps/shell`). Business code lives in `packages/<scope>/…` libraries. — _boundaries (`type:app` may hold no features)_
2.2 Every project has exactly one `scope:*` and one `type:*` tag; dependencies flow app → feature → ui|data → util → tokens; `shared` depends only on `shared`. — _@nx/enforce-module-boundaries, dependency-cruiser_
2.3 Features are leaves: reachable only through lazy routes, never imported. — _dependency-cruiser `features-are-leaves`_
2.4 Libraries are created by generators, never by hand. — _feature generator; reviewer agent_
2.5 New scopes, runtime dependencies and lint exceptions are human decisions with an ADR. — _scopes registry, guard-bash hook, guard-paths hook_
2.6 Files ≤ 300 lines, functions ≤ 60 lines, kebab-case names, no wildcard barrels, no deep imports. — _ESLint_

## 3. Angular

3.1 Standalone components, signals, `inject()`, native control flow, OnPush (v22 default). No NgModules, no decorator inputs/outputs, no `*ngIf`, no `any`. — _angular-eslint strict set_
3.2 Every route renders on the server by default; `Client` render mode requires a justification sentence in the spec. — _generator default, reviewer agent_
3.3 Node APIs and the SSR engine appear only in `server.ts`. — _dependency-cruiser_
3.4 Templates pass the accessibility rule set; pages pass axe WCAG 2.2 AA. — _angular-eslint template a11y, e2e axe fixture_

## 4. Design system

4.1 UI primitives live only in `packages/shared/ui`; features compose them. — _boundaries, reviewer_
4.2 Styling uses design tokens (`var(--ds-*)`) only; raw colours and px sizes are rejected. — _ui conformance spec_
4.3 Tokens are DTCG JSON compiled by Style Dictionary; generated output is committed and checked fresh. — _design-tokens:check-fresh, guard-paths hook_

## 5. Verification

5.1 `pnpm verify` is the single definition of done. Hooks run `verify:quick` on Stop; CI runs `verify:all`. — _stop-verify hook, CI_
5.2 No `--no-verify`, no `--force`/`-f` push, no force-push of `main`/`master`/`release/*` (feature branches: `--force-with-lease` only), no `eslint-disable`, no `.only`/`.skip`, no deleted tests. — _guard-bash hook, ESLint noInlineConfig, no-test-weakening.mjs_
5.3 Completion claims carry fresh verification output. — _superpowers:verification-before-completion_
5.4 A fresh-context reviewer checks every change against its spec before a PR. — _spec-reviewer agent_
5.5 Pure logic libraries meet the mutation-score threshold. — _Stryker (`break: 70`)_
5.6 Commit messages follow the Angular convention (types build|ci|docs|feat|fix|perf|refactor|revert|style|test, header ≤ 72, `BREAKING CHANGE:` footer, never `!`). — _commitlint: commit-msg hook, commit-messages verify stage, CI_
5.7 Commits are atomic: one logical change each; review fixes are amended/autosquashed into the commit they fix, never added as wip/review commits; history reaches main by rebase merge only. — _commit-messages verify stage, guard-bash hook, repo merge settings, PR reviewer_

## 6. Humans decide

Specs and their approval, scopes, dependencies, guardrail configuration, repository merge settings, acceptance-test changes, merges.
Everything else is the agents' job.
