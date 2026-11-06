#!/usr/bin/env node
/**
 * Lints every commit message on the branch (merge-base with main .. tip) against
 * commitlint.config.mjs. The commit-msg hook checks one commit at a time and lets
 * fixup!/squash! through for autosquash; this stage is what stops them, and any
 * other non-Angular header, from leaving the machine (pre-push, CI).
 *
 * Only the branch's own commits are linted: older history on main predates the
 * convention and is never rewritten.
 *
 * - tip: on a GitHub `pull_request` checkout HEAD is a synthetic merge commit, so
 *   its second parent (the PR head) is linted instead.
 * - base: the first ref that resolves out of argv[2], origin/$GITHUB_BASE_REF,
 *   origin/main, main; the range starts at its merge-base with the tip.
 * - Fails (exit 2) on a shallow clone, where the merge-base cannot be found.
 *
 * Usage: node scripts/verify/commit-messages.mjs [baseRef]
 */
import { spawnSync } from 'node:child_process';

/**
 * Runs git and returns trimmed stdout, or null when git exits non-zero.
 * @param {string[]} args git arguments
 * @returns {string | null}
 */
function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/**
 * Prints a failure message and exits 2.
 * @param {string} message what went wrong and how to fix it
 * @returns {never}
 */
function fail(message) {
  console.error(message);
  process.exit(2);
}

if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
  fail(
    'commit messages: this clone is shallow, so the merge-base with main is unknown. ' +
      'Fetch full history (actions/checkout `fetch-depth: 0`, or `git fetch --unshallow`).',
  );
}

const parents = (git(['rev-list', '--parents', '-n', '1', 'HEAD']) ?? '').split(
  ' ',
);
const tip =
  process.env.GITHUB_EVENT_NAME === 'pull_request' && parents.length === 3
    ? parents[2]
    : 'HEAD';

const baseRef = [
  process.argv[2],
  process.env.GITHUB_BASE_REF && `origin/${process.env.GITHUB_BASE_REF}`,
  'origin/main',
  'main',
].find(
  (ref) => ref && git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]),
);

if (!baseRef) {
  fail(
    'commit messages: no base ref found (tried argv, origin/$GITHUB_BASE_REF, origin/main, main).',
  );
}

const base = git(['merge-base', tip, baseRef]);
if (!base) fail(`commit messages: ${tip} has no merge-base with ${baseRef}.`);

const count = Number(git(['rev-list', '--count', `${base}..${tip}`]) ?? '0');
if (count === 0) {
  console.log(`commit messages: nothing since ${baseRef}.`);
  process.exit(0);
}

console.log(
  `commit messages: linting ${count} commit(s) since ${baseRef} (${base.slice(0, 12)}).`,
);
const r = spawnSync(
  'pnpm',
  ['exec', 'commitlint', '--from', base, '--to', tip, '--verbose'],
  {
    stdio: 'inherit',
  },
);
if (r.status !== 0) {
  fail(
    [
      '',
      'Fix the history, not the commitlint config (see docs/references/commits.md):',
      '  - last commit:       git commit --amend',
      '  - earlier commit:    git commit --fixup=reword:<sha>   (or --fixup=<sha> for content)',
      `  - then:              git rebase --autosquash ${base.slice(0, 12)}`,
      '  - fixup!/wip/merge:  squash them into the commit they belong to the same way',
      '  - once rewritten:    pnpm verify, then git push --force-with-lease (feature branch only)',
    ].join('\n'),
  );
}
