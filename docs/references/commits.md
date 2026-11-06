# Commits

How to write commit messages here and how to keep a branch atomic. Rationale:
`docs/adr/0003-angular-commits-and-atomic-history.md`. Rules: `commitlint.config.mjs`.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

- Header ≤ 72 characters: lower-case type, optional scope, imperative subject, no trailing period.
- Wrap the body at about 72 columns and explain _why_. Lines over 100 only warn, so trailers and
  URLs can stay unwrapped.

## Types

| Type       | Use for                                                             |
| ---------- | ------------------------------------------------------------------- |
| `feat`     | A new user-visible capability                                       |
| `fix`      | A bug fix                                                           |
| `refactor` | A code change that neither fixes a bug nor adds a feature           |
| `perf`     | A change whose purpose is speed or size                             |
| `test`     | Tests only (e.g. acceptance tests from a spec)                      |
| `docs`     | Documentation only (`docs/`, READMEs, `AGENTS.md`, skills)          |
| `style`    | Formatting only; no change in meaning                               |
| `build`    | Dependencies, package scripts, Docker, Makefile, Nx and tool config |
| `ci`       | CI workflows, verify stages, git and Claude Code hooks              |
| `revert`   | Reverting an earlier commit (see the recipe below)                  |

There is no `chore`. If nothing else fits, pick `build`, `ci` or `refactor` by what the change
touches.

## Scopes

Free-form kebab-case: an nx project name (`shell`, `shared-ui`) or an area such as `hooks`,
`verify`, `make`, `docker`, `docs`. Leave the scope out when the change spans several areas.

## Examples from `main`

```
fix(hooks): isolate the PR reviewer and tighten its triggers and tools
fix(make): parse .nvmrc like the verify gate and serialise compound targets
ci(hooks): dispatch independent code review after gh pr create
build(docker): distroless SSR image and Node LTS pin
```

## Breaking changes

Use a footer, never `!` after the type or scope (`feat!:` fails `subject-exclamation-mark`):

```
refactor(shared-ui): rename button variants

BREAKING CHANGE: `variant="primary"` is now `variant="solid"`.
```

## Trailers

Trailers go last, after a blank line, and pass the lint as body text:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_…
```

## Atomic commits

One logical change per commit; a PR with two independent changes has two commits. Review fixes go
into the commit they fix. Never add `wip`, `fixup`, `address review comments` or
`apply suggestions` commits (the `subject-no-review-noise` rule rejects them).

## Recipes

### Change the last commit

```
git add <files>
git commit --amend --no-edit
```

### Fix an older commit on the branch

```
git commit --fixup=<sha>
git rebase --autosquash $(git merge-base HEAD origin/main)
```

### Reword an older commit

```
git commit --fixup=reword:<sha>     # opens an editor for the new message
git rebase --autosquash $(git merge-base HEAD origin/main)
```

### Revert a commit

`git revert`'s default `Revert "…"` header fails the lint. Write the message yourself:

```
git revert --no-commit <sha>
git commit -m "revert: <original subject, shortened to fit 72 chars>" -m "This reverts commit <sha> (<original header>)."
```

The `revert: ` prefix adds 8 characters, so shorten the subject until the whole header is 72 characters
or fewer. The full original header goes in the body, which has no length limit.

### Then publish

```
pnpm verify
git push --force-with-lease
```

`--force-with-lease` only to your own feature branch. Never force-push `main`, `master` or
`release/*`, and never use plain `--force`/`-f` or a `+refspec`.

## Gates

| Gate                                       | When                | Checks                                                                   |
| ------------------------------------------ | ------------------- | ------------------------------------------------------------------------ |
| `.githooks/commit-msg`                     | every commit        | the new message; lets `fixup!`/`squash!`/`amend!` through for autosquash |
| "commit messages" stage of `pnpm verify`   | pre-push, CI        | every commit since the merge-base with main; fixup, merge, `Revert "…"`  |
| guard-bash hook (`.claude/hooks/`)         | agent Bash commands | `--no-verify`; every force-push except a lease push to a feature branch  |
| repository merge settings (set by a human) | merge               | rebase merges only, so atomic commits reach main unchanged               |

The "commit messages" stage is not in `verify:quick`, so a branch with a pending `fixup!` still
passes the pre-commit hook. Fix failures by rewording or squashing (recipes above), never by
editing `commitlint.config.mjs`.
