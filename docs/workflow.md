# Workflow: from idea to merged

```
 human            agent                         gate
 ─────            ─────                         ────
 idea ──────────▶ superpowers:brainstorming
                  writes docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md   spec-approved.mjs (Status line, REQ ids)
 approves ◀──────┘ (sets Status: approved)
                  superpowers:writing-plans → docs/superpowers/plans/…          plan points at approved spec
                  acceptance-author subagent → apps/shell-e2e/src/<f>.spec.ts   must FAIL; committed alone
                  nx g @starter/tools:feature                                   refuses unapproved spec / unknown scope
                  per task: red → green → pnpm verify:quick → commit            PostToolUse lint, Stop hook, commit-msg (Angular)
                  pnpm verify                                                   full gate incl. SSR e2e
                  spec-reviewer subagent                                        APPROVE required
                  superpowers:finishing-a-development-branch → PR               CI: verify:all + mutation
 reviews, merges ◀┘
```

## Roles

- **Human**: owns intent. Writes/approves specs, registers scopes, approves dependencies, merges.
  Sets the repository to rebase-only merges so atomic commits reach `main` unchanged.
  Expected effort: 30–60 min per feature spec, 5–10 min per PR.
- **Implementing agent** (Claude Code with Superpowers): everything between approval and PR.
- **acceptance-author**: fresh context, spec-only input, writes failing Playwright tests.
- **spec-reviewer**: fresh context, read-only, maps REQ → code → test, flags vacuous tests.
- **PR reviewer** (`.claude/hooks/pr-review.mjs`): fires after `gh pr create`; runs `/code-review` in a
  separate headless Claude Code process and posts confirmed findings as PR comments. Set
  `PR_REVIEW_SKIP=1` in your shell to opt out for a trivial PR.

## Review fixes

Fold each fix into the commit it belongs to; never add a "wip" or "address review" commit:
`git commit --fixup=<sha>` → `git rebase --autosquash $(git merge-base HEAD origin/main)` →
`pnpm verify` → `git push --force-with-lease`. Recipes in `docs/references/commits.md`.

## Artefacts and where they live

| Artefact          | Path                                                  | Owner                |
| ----------------- | ----------------------------------------------------- | -------------------- |
| Design doc / spec | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | human approves       |
| Plan              | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`      | agent                |
| Acceptance tests  | `apps/shell-e2e/src/<feature>.spec.ts`                | human after creation |
| Feature library   | `packages/<scope>/feature-<name>/`                    | agent                |
| ADR               | `docs/adr/NNNN-<title>.md`                            | human                |

## Sizing

A spec covers one user-visible capability (one route or one component family). A plan task
touches ≤ 5 files. If a plan exceeds ~10 tasks, split the spec.

## Parallel work

Use `superpowers:using-git-worktrees`; one feature per worktree; each worktree runs its own
`pnpm verify`. Nx caching makes repeated runs cheap.
