#!/usr/bin/env node
/**
 * PostToolUse(Bash, `gh pr create`): hand the new PR to an independent reviewer.
 *
 * The session that wrote the code is the worst judge of it, so the review runs in a
 * separate headless Claude Code process with a fresh context: `claude -p "/code-review
 * <n> --comment"`. That skill reads the PR diff, verifies each finding and posts the
 * confirmed ones as inline PR comments through `gh`; the appended system prompt makes it
 * leave a summary comment when nothing was found so the PR always shows a result.
 *
 * The child is detached and unreferenced, so this hook returns at once and the authoring
 * session continues. Output goes to a log file whose path is shown in the systemMessage.
 *
 * Environment:
 *   PR_REVIEW_MODEL   model for the reviewer (default: opus)
 *   PR_REVIEW_LEVEL   /code-review effort level (default: high)
 *   PR_REVIEW_SKIP=1  do nothing (humans opt out for a trivial PR)
 *   PR_REVIEW_DRY_RUN=1  print the command instead of spawning it (hook self-test)
 *   PR_REVIEW_CHILD   set on the reviewer so a nested `gh pr create` never recurses
 */
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readInput, allow } from './_io.mjs';

const input = await readInput();
const cmd = String(input?.tool_input?.command ?? '');
if (!/\bgh\s+pr\s+create\b/.test(cmd)) allow();
if (process.env.PR_REVIEW_SKIP || process.env.PR_REVIEW_CHILD) allow();

const response = input?.tool_response ?? {};
const output = [
  response.stdout,
  response.stderr,
  typeof response === 'string' ? response : '',
]
  .filter(Boolean)
  .join('\n');
const match = output.match(
  /https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/(\d+)/,
);
if (!match) allow();

const [prUrl, prNumber] = match;
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const model = process.env.PR_REVIEW_MODEL ?? 'opus';
const level = process.env.PR_REVIEW_LEVEL ?? 'high';
const logPath = join(tmpdir(), `claude-pr-review-${prNumber}.log`);

const systemPrompt = [
  `You are an automated reviewer for pull request #${prNumber} (${prUrl}).`,
  'You did not write this code and have no memory of the session that did.',
  'Review only; never edit files, commit, push, or create pull requests.',
  'Every finding you post must be on the PR itself, through gh.',
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
  'Bash(gh api *)',
  'Bash(git fetch*)',
  'Bash(git diff*)',
  'Bash(git log*)',
  'Bash(git show*)',
  'Bash(git status*)',
];

const args = [
  '-p',
  `/code-review ${level} ${prNumber} --comment`,
  '--model',
  model,
  '--append-system-prompt',
  systemPrompt,
  '--allowedTools',
  ...allowedTools,
];

if (process.env.PR_REVIEW_DRY_RUN) {
  process.stdout.write(
    JSON.stringify({ cwd: root, logPath, args }, null, 2) + '\n',
  );
  process.exit(0);
}

const log = openSync(logPath, 'a');
const child = spawn('claude', args, {
  cwd: root,
  detached: true,
  stdio: ['ignore', log, log],
  env: { ...process.env, PR_REVIEW_CHILD: '1' },
});
child.unref();

process.stdout.write(
  JSON.stringify({
    systemMessage: `Independent review of PR #${prNumber} started in the background (log: ${logPath}). Findings will appear as PR comments.`,
  }),
);
process.exit(0);
