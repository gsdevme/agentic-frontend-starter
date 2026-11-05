# Agent operating manual

You are working in an agent-maintained Angular 22 SSR monorepo. Humans write specs and review;
agents write code. Nothing is "done" until `pnpm verify` passes — hooks enforce this.

## Map (read the file you need, not all of them)

| Need                                            | Read                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Non-negotiable rules                            | `docs/constitution.md`                                                       |
| How a feature goes from idea to merged          | `docs/workflow.md`                                                           |
| Library layers, tags, what may import what      | `docs/architecture/boundaries.md`                                            |
| Registered domain scopes                        | `docs/architecture/scopes.md`                                                |
| What each verification stage checks             | `docs/architecture/verification.md`                                          |
| Things that bite (SSR host check, daemon, etc.) | `docs/references/landmines.md`                                               |
| Spec / plan templates                           | `docs/superpowers/specs/_TEMPLATE.md`, `docs/superpowers/plans/_TEMPLATE.md` |
| Angular v22 idioms the models get wrong         | `docs/references/angular-v22-rules.md`                                       |
| Design system (tokens, components)              | `packages/shared/design-tokens/README.md`, `packages/shared/ui/README.md`    |

## Commands (always via nx; never call eslint/vitest/ng directly)

```
pnpm verify            # affected: spec gate → format → lint → build libs → unit → traceability → depcruise → knip → SSR build → e2e
pnpm verify:quick      # the first six stages only (what the PostToolUse/Stop hooks run)
pnpm nx g @starter/tools:feature <name> --scope=<scope> --spec=docs/superpowers/specs/<file>.md
pnpm nx g @nx/angular:component --path=packages/shared/ui/src/lib/<name>/<name> --export
pnpm nx run shell:serve           # dev server (SSR) on :4200
pnpm build && pnpm serve:ssr      # production SSR server on :4000
pnpm nx e2e shell-e2e             # Playwright against the production server
pnpm nx show project <name>       # targets/tags for one project
```

## Workflow in one paragraph

Brainstorm with the human → write `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` from the
template with numbered `REQ-<AREA>-NNN` lines → human sets `Status: approved` → write the plan in
`docs/superpowers/plans/` → write the Playwright acceptance tests from the spec's scenarios FIRST (in a
separate commit) → scaffold with the `feature` generator → implement task by task → `pnpm verify` →
dispatch `spec-reviewer` subagent → open PR. Superpowers skills (`brainstorming`, `writing-plans`,
`subagent-driven-development`, `verification-before-completion`) drive each step.

## Hard rules the hooks enforce (don't fight them, fix the cause)

- No `--no-verify`, no force-push, no `eslint-disable`, no `.only`/`.skip`, no deleting tests.
- Approved specs under `docs/superpowers/specs/` and acceptance tests under `apps/*-e2e/` are
  human-owned: agents may add, never edit, unless the human says so (set `ALLOW_ACCEPTANCE_EDIT=1`).
- Every test title starts with its requirement id: `it('[REQ-INVOICE-003] …')`.
- New libraries come from generators, never by hand. New scopes are a human decision (see scopes.md).
- Only `packages/shared/ui` contains UI primitives; only `var(--ds-*)` tokens appear in CSS.
- Stop claiming completion without the fresh `pnpm verify` output in your message.

## Landmines (full list in docs/references/landmines.md)

- Angular SSR rejects unknown `Host` headers (400). Allowed hosts: `apps/shell/project.json` →
  `security.allowedHosts`; at runtime `NG_ALLOWED_HOSTS=a.example.com,b.example.com`.
- If lint says a package "is not used" for an import that clearly exists, the Nx daemon graph is
  stale: `pnpm nx reset` and rerun. Don't edit package.json to appease it.
- `@nx/dependency-checks` wants each library's `package.json` peerDependencies to match real imports.
  Run `pnpm nx run <project>:lint --fix` to sync them.
- Vitest here is Angular's `@angular/build:unit-test`; there is no `vitest.config` per library.
- `import.meta.glob` is typed by a local `.d.ts` in `packages/shared/ui/src`, test-only.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
