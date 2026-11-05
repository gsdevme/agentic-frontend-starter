#!/usr/bin/env node
/**
 * PostToolUse(Bash, `gh pr create`): hand the new PR to an independent reviewer.
 *
 * The session that wrote the code is the worst judge of it, so the review runs in a
 * separate headless Claude Code process with a fresh context: `claude -p "/code-review
 * <n> --comment"`. That skill reads the PR diff, verifies each finding and posts the
 * confirmed ones to the PR through `gh`; the appended system prompt makes it leave a
 * summary comment when nothing was found so the PR always shows a result.
 *
 * Isolation:
 *  - The reviewer runs in a detached git worktree at the commit that was just pushed,
 *    so it never reads the author's live working tree, and the project Stop hook sees a
 *    clean checkout. The worktree is removed when the reviewer exits.
 *  - It receives a minimal environment, not the authoring session's identity.
 *  - Its tool allowlist is read-only git plus `gh pr` subcommands scoped to the PR.
 *    `gh api` is deliberately absent: a reviewer reading untrusted diffs must not hold
 *    arbitrary write access to the GitHub account.
 *
 * The hook returns once the child has started; output goes to a log file whose path is
 * shown in the systemMessage.
 *
 * Environment:
 *   PR_REVIEW_MODEL      model for the reviewer (default: opus)
 *   PR_REVIEW_LEVEL      /code-review effort level (default: high)
 *   PR_REVIEW_SKIP=1     do nothing (humans opt out for a trivial PR)
 *   PR_REVIEW_DRY_RUN=1  print the command instead of spawning it (hook self-test)
 *   PR_REVIEW_CHILD      set on the reviewer so a nested `gh pr create` never recurses
 */
import { spawn, spawnSync } from 'node:child_process';
import { openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readInput, allow } from './_io.mjs';

const enabled = (v) =>
  v !== undefined && v !== '' && v !== '0' && v !== 'false';

const input = await readInput();
const cmd = String(input?.tool_input?.command ?? '');
if (!/\bgh\s+pr\s+create\b/.test(cmd)) allow();
if (enabled(process.env.PR_REVIEW_SKIP) || enabled(process.env.PR_REVIEW_CHILD))
  allow();

const response = input?.tool_response ?? {};
const exitCode = response.exit_code ?? response.exitCode ?? response.code;
if (exitCode !== undefined && exitCode !== null && Number(exitCode) !== 0)
  allow();
if (response.interrupted) allow();

// gh prints the new PR's URL on stdout; "already exists: <url>" goes to stderr.
const stdout =
  typeof response === 'string' ? response : String(response.stdout ?? '');
const match = stdout.match(
  /https:\/\/github\.com\/([^\s/]+\/[^\s/]+)\/pull\/(\d+)/,
);
if (!match) allow();

const [prUrl, repo, prNumber] = match;
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const model = process.env.PR_REVIEW_MODEL ?? 'opus';
const level = process.env.PR_REVIEW_LEVEL ?? 'high';
const logPath = join(tmpdir(), `claude-pr-review-${prNumber}.log`);
const worktree = join(tmpdir(), `claude-pr-review-${prNumber}-wt`);

const git = (...args) =>
  spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
const head = git('rev-parse', 'HEAD').stdout.trim();
if (!head) allow();

const claudeBin = spawnSync('which', ['claude'], {
  encoding: 'utf8',
}).stdout.trim();
if (!claudeBin) {
  process.stdout.write(
    JSON.stringify({
      systemMessage: `PR #${prNumber} was created but no independent review started: \`claude\` is not on the hook's PATH.`,
    }),
  );
  process.exit(0);
}

const systemPrompt = [
  `You are an automated reviewer for pull request #${prNumber} in ${repo} (${prUrl}).`,
  'You did not write this code and have no memory of the session that did.',
  'Review only: never edit files, commit, push, approve, request changes, or create pull requests.',
  'Post findings on the PR through `gh pr review --comment` or `gh pr comment`; if a command',
  'is not permitted, fall back to `gh pr comment` with the findings as a markdown list.',
  'If the review ends with no findings posted, post one `gh pr comment` saying the automated',
  'review found no issues, with one line on what was checked.',
].join(' ');

const allowedTools = [
  'Read',
  'Grep',
  'Glob',
  'Skill',
  'ToolSearch',
  'Agent',
  'Bash(gh pr view*)',
  'Bash(gh pr diff*)',
  'Bash(gh pr checks*)',
  'Bash(gh pr comment*)',
  'Bash(gh pr review*)',
  'Bash(git fetch*)',
  'Bash(git diff*)',
  'Bash(git log*)',
  'Bash(git show*)',
  'Bash(git status*)',
];

const claudeArgs = [
  '-p',
  `/code-review ${level} ${prNumber} --comment`,
  '--model',
  model,
  '--append-system-prompt',
  systemPrompt,
  '--allowedTools',
  ...allowedTools,
];

// Minimal environment: enough for node, git and gh to work, nothing identifying the parent session.
const passthrough = [
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TMPDIR',
  'LANG',
  'LC_ALL',
  'TERM',
  'GH_TOKEN',
  'GH_HOST',
  'GITHUB_TOKEN',
  'SSH_AUTH_SOCK',
];
const env = Object.fromEntries(
  passthrough.filter((k) => process.env[k]).map((k) => [k, process.env[k]]),
);
env.PR_REVIEW_CHILD = '1';

// Review in a detached worktree at the pushed commit, then clean it up whatever the outcome.
const wrapper = [
  'set -u',
  'root=$1; wt=$2; head=$3; shift 3',
  'git -C "$root" worktree add --detach "$wt" "$head" || exit 1',
  'trap \'git -C "$root" worktree remove --force "$wt"\' EXIT',
  'cd "$wt" && CLAUDE_PROJECT_DIR="$wt" "$@"',
].join('\n');
const spawnArgs = [
  '-c',
  wrapper,
  'pr-review',
  root,
  worktree,
  head,
  claudeBin,
  ...claudeArgs,
];

if (enabled(process.env.PR_REVIEW_DRY_RUN)) {
  process.stdout.write(
    JSON.stringify(
      { root, worktree, head, logPath, env: Object.keys(env), claudeArgs },
      null,
      2,
    ) + '\n',
  );
  process.exit(0);
}

const log = openSync(logPath, 'a');
const child = spawn('bash', spawnArgs, {
  cwd: root,
  detached: true,
  stdio: ['ignore', log, log],
  env,
});

const finish = (message) => {
  process.stdout.write(JSON.stringify({ systemMessage: message }));
  process.exit(0);
};
child.once('error', (err) =>
  finish(
    `PR #${prNumber} was created but the independent review failed to start: ${err.message}`,
  ),
);
child.once('spawn', () => {
  child.unref();
  finish(
    `Independent review of PR #${prNumber} started in the background on a detached worktree (log: ${logPath}). Findings will appear as PR comments.`,
  );
});
