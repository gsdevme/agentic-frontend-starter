# Agentic Frontend Starter

An empty, production-shaped **Angular 22 SSR** monorepo built to be written almost entirely by AI
coding agents under spec-driven development. There is no feature code here — only the harness:
hard-line specs, structural guardrails, a verification pyramid, and agent workflow wiring
(Claude Code + [Superpowers](https://github.com/obra/superpowers)).

Humans write and approve specs, make architectural decisions and merge. Agents do the rest, and
cannot mark work done until `pnpm verify` is green.

## What is in the box

| Layer         | What                                                                                                                                                                                                                            | Where                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| App           | Zoneless Angular 22, `@angular/ssr` Node server, per-route render modes, health endpoint, accessible shell                                                                                                                      | `apps/shell`                                                                                            |
| Design system | DTCG tokens → Style Dictionary → CSS vars + TS types; empty UI library with a conformance test                                                                                                                                  | `packages/shared/design-tokens`, `packages/shared/ui`                                                   |
| Structure     | Nx 24 tags (`scope` × `type`) + `@nx/enforce-module-boundaries`; dependency-cruiser; Knip; strict TS; type-aware ESLint; angular-eslint strict + a11y; file/size/naming rules; no inline rule bypass                            | `eslint.config.mjs`, `eslint.angular.mjs`, `.dependency-cruiser.cjs`, `knip.json`                       |
| Scaffolding   | `feature` generator: refuses unapproved specs and unregistered scopes, wires the lazy route and render mode, stamps tags and spec traceability                                                                                  | `tools/workspace-plugin`                                                                                |
| Specs         | Superpowers conventions (`docs/superpowers/specs                                                                                                                                                                                | plans`), EARS requirements with `REQ-…` ids, approved-spec immutability, acceptance tests derived first | `docs/`, `scripts/verify/` |
| Verification  | `pnpm verify`: node version → spec gate → format → lint → typecheck → unit → traceability → graph → dead code → tokens → SSR build → Playwright (no-JS render, hydration, axe WCAG 2.2 AA) → anti-test-weakening; Stryker in CI | `scripts/verify/all.mjs`, `apps/shell-e2e`, `stryker.config.mjs`                                        |
| Agent wiring  | `AGENTS.md` map (CLAUDE.md imports it), Claude Code hooks (command/path guards, per-edit lint, Stop gate), read-only `spec-reviewer` and `acceptance-author` subagents, project skills, plugins declared at project scope       | `.claude/`                                                                                              |
| CI            | GitHub Actions: `verify:all` on every PR, mutation testing on changed pure logic, Playwright report artefact                                                                                                                    | `.github/workflows/ci.yml`                                                                              |

## Quick start

```bash
nvm use                      # or `fnm use`: Node major from .nvmrc (pnpm install refuses others)
npm i -g pnpm@10.28.0        # Node >= 25 ships no corepack; match package.json#packageManager
pnpm install                 # also installs git hooks (pre-commit: verify:quick, commit-msg: commitlint, pre-push: verify)
pnpm exec playwright install chromium
pnpm verify:all              # everything should be green on a fresh clone
pnpm nx run shell:serve      # SSR dev server → http://localhost:4200
```

A `Makefile` wraps the same commands: `make setup` for a fresh clone, `make dev`, `make verify`,
`make preview`, `make docker-build`. Run `make help` for the full list.

Open the repo in Claude Code. `.claude/settings.json` enables the `superpowers` and `nx` plugins at
project scope; accept the prompt to install them locally. The Nx MCP server is configured by the Nx
plugin.

## Delivering the first feature

1. **Register a scope** (human): add a row to `docs/architecture/scopes.md`, add it to `SCOPES` in
   `eslint.config.mjs`, write an ADR.
2. **Brainstorm → spec** (agent + human): `superpowers:brainstorming` produces
   `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` from `_TEMPLATE.md`. The human sets
   `Status: approved`.
3. **Plan** (agent): `superpowers:writing-plans` → `docs/superpowers/plans/…`.
4. **Acceptance tests first** (agent): dispatch `acceptance-author`; commit the failing Playwright file alone.
5. **Scaffold** (agent): `pnpm nx g @starter/tools:feature <name> --scope=<scope> --spec=<spec>`.
6. **Implement** (agent): red → green → `pnpm verify:quick` → commit, per task.
7. **Gate + review** (agent): `pnpm verify`, then the `spec-reviewer` subagent.
8. **PR** (agent) → **merge** (human). CI re-runs `verify:all`.

The full procedure, with the reasons behind each step, is in `docs/workflow.md` and the
`feature-workflow` skill.

## Wiring in your design system

Export the design system's tokens as DTCG JSON into `packages/shared/design-tokens/tokens/`, run
`pnpm tokens`, commit. Implement components in `packages/shared/ui` from their specs; the
conformance test enforces token-only styling and a spec per component. See
`packages/shared/design-tokens/README.md`.

## Guardrail philosophy

Prose instructions are advisory; hooks, lint and CI are deterministic. Every rule in
`docs/constitution.md` names the mechanism that enforces it. When an agent keeps violating an
instruction, the fix is a new check, not a louder sentence in `AGENTS.md`.

Human-owned files (hooks, lint configs, CI, constitution, approved specs, acceptance tests) are
blocked for agents by `.claude/hooks/guard-paths.mjs`; the escape hatches (`ALLOW_ACCEPTANCE_EDIT=1`,
`ALLOW_GENERATOR_EDIT=1`) are environment variables a human sets in their own shell.

## Layout

```
apps/shell/                 the one deployable (SSR)
apps/shell-e2e/             Playwright acceptance tests against the production server
packages/shared/            design-tokens, ui (type:tokens, type:ui)
packages/<scope>/           feature-*, data, util-* (created by generators)
tools/workspace-plugin/     Nx generators (@starter/tools:feature)
scripts/verify/             verification gates (all.mjs is the entry point)
docs/                       constitution, workflow, architecture, superpowers specs & plans, ADRs, references
.claude/                    settings (plugins, permissions, hooks), hooks, agents, skills
```

## Deployment

The root `Dockerfile` builds the SSR shell into a distroless Node image:

```bash
docker build -t shell:local .
docker run --rm -p 4000:4000 -e NG_ALLOWED_HOSTS=localhost shell:local
```

| Variable           | Default | Purpose                                                                                                                                                  |
| ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`             | `4000`  | Port the SSR server listens on.                                                                                                                          |
| `NG_ALLOWED_HOSTS` | none    | Comma-separated hostnames the server will render for. Must list every ingress hostname, or Angular SSR answers 400 (see `docs/references/landmines.md`). |

- **Probes:** point readiness and liveness probes at `GET /healthz` (returns `200 {"status":"ok"}`).
  The image has no `HEALTHCHECK`; the orchestrator probes the endpoint itself.
- **Image:** `gcr.io/distroless/nodejs<major>-debian13:nonroot`. It runs as a non-root user and has
  no shell or package manager, so `docker exec … sh` will not work.
- **Debugging:** to get a busybox shell, edit the runtime `FROM` tag from `nonroot` to `debug-nonroot`
  in a local build only. Never ship the debug tag to production.
- **Node version:** always the newest Active LTS, pinned in `.nvmrc`; the Dockerfile's `NODE_MAJOR`
  must match it (`pnpm verify` checks). Policy and bump procedure: `docs/adr/0002-node-latest-lts.md`.

## Status

Template v0.1 (2026-11-05). Known follow-ups are listed at the end of
`docs/architecture/verification.md` (Storybook, visual regression, API contract generation) and in
ADR 0001.
