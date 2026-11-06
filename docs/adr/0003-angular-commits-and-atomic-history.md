# ADR 0003 — Angular commit messages and atomic history

Date: 2026-11-06 · Status: accepted

## Context

Agents write almost every commit in this repo, and humans review the result one PR at a time.
Until now nothing checked commit messages: recent commits followed Conventional Commits out of
habit, older ones on `main` do not (a `chore:` type, a 100+ character subject that covers several
topics). A history like that cannot be bisected one change at a time, gives no changelog, and lets
"wip" or "address review" commits reach `main`. The constitution requires every rule to name the
mechanism that enforces it, so writing the convention down without enforcing it is not enough.

## Decision

- **Angular convention, enforced by commitlint** (`@commitlint/cli` + `@commitlint/config-angular`,
  configured in `commitlint.config.mjs`):
  - types `build`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`; no
    `chore`;
  - header ≤ 72 characters; scope optional, free-form kebab-case;
  - breaking changes use a `BREAKING CHANGE:` footer; `feat!:` is rejected;
  - subjects that describe review churn (`wip`, `fixup`, `address review comments`, …) are
    rejected by a local `subject-no-review-noise` rule.
- **Three gates.** The `.githooks/commit-msg` hook lints each commit as it is made, but lets
  `fixup!`/`squash!`/`amend!` through so autosquash works. The "commit messages" stage of
  `pnpm verify` (`scripts/verify/commit-messages.mjs`, not part of `verify:quick`) lints every
  commit since the merge-base with `main` with `defaultIgnores: false`, so fixup, merge and
  `Revert "…"` commits fail. It runs at pre-push and in CI (`verify:all`). History already on
  `main` is never linted or rewritten.
- **Atomic commits.** One logical change per commit. Review fixes are amended or autosquashed into
  the commit they fix and pushed with `git push --force-with-lease` to the agent's own feature
  branch. Plain `--force`/`-f`/`+refspec` pushes and any force-push to `main`, `master` or
  `release/*` stay blocked by the guard-bash hook.
- **Rebase merges only.** The human sets the repository merge settings (no squash, no merge
  commits) so atomic commits reach `main` unchanged.
- **Constitution.** `docs/constitution.md` gains rules 5.6 and 5.7 and an amended 5.2. The human
  edits that file; the text is:
  - 5.2: no `--force`/`-f` push, no force-push of `main`/`master`/`release/*` (feature branches:
    `--force-with-lease` only).
  - 5.6: Commit messages follow the Angular convention (types
    build|ci|docs|feat|fix|perf|refactor|revert|style|test, header ≤ 72, `BREAKING CHANGE:`
    footer, never `!`). — _commitlint: commit-msg hook, commit-messages verify stage, CI_
  - 5.7: Commits are atomic: one logical change each; review fixes are amended/autosquashed into
    the commit they fix, never added as wip/review commits; history reaches main by rebase merge
    only. — _commit-messages verify stage, guard-bash hook, repo merge settings, PR reviewer_
  - §6 adds "repository merge settings" to the enforcement mechanisms.

## Alternatives

- **`@commitlint/config-conventional`:** allows `chore` (a type that says nothing) and `feat!:`.
  The Angular preset has a closed type list and one way to mark a breaking change.
- **husky or lefthook:** both add a dependency and a second hook system. The repo already uses
  `core.hooksPath = .githooks`, so the new hook is one more shell script there.
- **Squash merges:** they keep `main` linear without rules on the branch, but they collapse a PR's
  separate changes into one commit, which is the atomicity this decision exists to keep.
- **A `-m` pre-check in guard-bash:** it would duplicate the commitlint config and miss `-F`,
  editor and heredoc messages. The commit-msg hook already shows the agent commitlint's output.

## Consequences

- `git revert`'s default `Revert "…"` message fails the range lint; reword it to
  `revert: <original header>` (recipe in `docs/references/commits.md`).
- Fixup commits must be autosquashed (`git rebase --autosquash <merge-base>`) before pushing, or
  `pnpm verify` fails at pre-push.
- CI needs full history (`fetch-depth: 0`) to find the merge-base.
- The human must set rebase-only merges and branch protection on `main` (no force-push, linear
  history, required `verify` check); agents cannot.
