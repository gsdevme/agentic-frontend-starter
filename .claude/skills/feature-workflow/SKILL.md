---
name: feature-workflow
description: Step-by-step procedure for delivering a feature in this repo, from approved spec to PR, with the exact commands and gates. Use whenever asked to build, add, implement or change a feature or page.
---

# Feature workflow (this repo)

Superpowers provides the generic method (`brainstorming` → `writing-plans` →
`subagent-driven-development` → `verification-before-completion`). This skill adds the repo-specific
artefacts and commands. Follow the steps in order; the hooks will stop you if you skip one.

## 0. Preconditions

- An approved spec exists: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` with `Status: approved`
  and numbered `REQ-<AREA>-NNN` lines. If not, run `superpowers:brainstorming` and stop until a human approves.
- The scope is registered in `docs/architecture/scopes.md`. If not, stop: adding a scope is a human decision.

## 1. Plan

`superpowers:writing-plans` → `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` using the template.
Tasks touch ≤ 5 files each and name the REQ ids they close.

## 2. Acceptance tests first (separate commit)

Dispatch the `acceptance-author` subagent with the spec path. Commit its file alone:
`git commit -m "test(<feature>): acceptance tests from <spec-topic>"`. They must fail at this point.

## 3. Scaffold

```
pnpm nx g @starter/tools:feature <name> --scope=<scope> --spec=docs/superpowers/specs/<file>.md [--route=<path>] [--renderMode=server|prerender|client]
```

Never create libraries by hand. For UI primitives: `pnpm nx g @nx/angular:component --path=packages/shared/ui/src/lib/<name>/<name> --export`.
For data access: a `type:data` library (generator coming; until then copy the shape of an existing one or ask).

## 4. Implement task by task

For each plan task: write the unit test with its REQ id → run `pnpm nx test <project>` (red) →
implement → green → `pnpm verify:quick` → commit (one logical change, Angular header — see
`docs/references/commits.md`). Use `superpowers:subagent-driven-development`
for parallel tasks in separate worktrees (`superpowers:using-git-worktrees`).

## 5. Full gate

`pnpm verify` (runs e2e against the production SSR build). Paste the final summary line in your message.

## 6. Review

Dispatch `spec-reviewer` with spec, plan and base ref. Address REQUEST CHANGES; re-run `pnpm verify`.

## 7. Finish

`superpowers:finishing-a-development-branch`. PR description lists REQ ids → tests, the verify
output, and any spec ambiguities found (so the human fixes the spec, not you).

## Never

- Edit an approved spec or an existing acceptance test (hooks block it).
- Mark a plan task done without the fresh test output.
- Add runtime dependencies, scopes, or lint exceptions on your own.
