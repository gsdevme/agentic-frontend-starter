#!/usr/bin/env node
/**
 * PreToolUse(Bash): block commands that bypass verification or rewrite history.
 * This is a backstop for the deny rules in settings.json (deny rules can be
 * overridden by a user's local settings; a hook cannot be, and it survives
 * --dangerously-skip-permissions).
 *
 * Force-pushes fail closed: plain force is matched anywhere in the raw text,
 * and any command that mentions `--force-with-lease` must be exactly one
 * allowed shape (see forcePushViolation). Text that merely mentions the flag,
 * such as a heredoc or a `git commit -m` message, is refused too; write such
 * messages to a file and use `git commit -F <file>`.
 */
import { readInput, deny, allow } from './_io.mjs';

const input = await readInput();
const cmd = String(input?.tool_input?.command ?? '');

const rules = [
  [
    /\bgit\s+(commit|push|merge|rebase)\b[^|;&]*\s(--no-verify|-n)\b/,
    'Hooks may not be skipped (--no-verify). Fix the failing check instead.',
  ],
  [
    /\bgit\s+reset\s+--hard\b/,
    'git reset --hard is not allowed; use git stash or a new branch.',
  ],
  [
    /\bgit\s+(branch|push)\b[^|;&]*\s-D\b|\bgit\s+push\b[^|;&]*--delete\b/,
    'Deleting branches is a human action.',
  ],
  [
    /\bgit\s+checkout\s+--\s+.*(spec|test)\.ts\b/,
    'Reverting test files is not allowed; tests are the oracle.',
  ],
  [
    /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b.*\b(apps|packages|docs|tools|\.claude|\.github)\b/,
    'Recursive deletes inside source trees are blocked. Delete specific files and explain why.',
  ],
  [
    /\b(eslint|vitest|ng|playwright|tsc)\s+(?!--version)/,
    'Run tools through nx (pnpm nx …) so caching, tags and project config apply. See AGENTS.md → Commands.',
  ],
  [
    /\bnpm\s+(i|install|add)\b|\byarn\s+add\b/,
    'This repo uses pnpm. Use `pnpm add -D <pkg>` and explain the dependency in the plan.',
  ],
  [
    /\bpnpm\s+add\b(?!.*\s-D\b)/,
    'Runtime dependencies are an architectural decision: add them with -D only after the spec names them, and record an ADR in docs/adr/.',
  ],
  [
    /\b(ALLOW_ACCEPTANCE_EDIT|SKIP_VERIFY|HUSKY=0)\b/,
    'Verification escape hatches are set by humans in their own shell, not by agents.',
  ],
  [
    /--dangerously-skip-permissions|--allowedTools|settings\.local\.json/,
    'Agent-side permission changes are not allowed.',
  ],
  [
    /\bsed\s+-i\b.*(eslint|dependency-cruiser|stryker|knip|settings\.json|constitution)/,
    'Guardrail configuration is human-owned. Propose the change in the PR description instead.',
  ],
];

/**
 * Plain force anywhere in the text, quotes included: a `git` word, then a
 * `push` word in the same segment, then `--force` (or an abbreviation of it)
 * not followed by `-with-lease` or `-if-includes` (which only modifies a
 * lease), a short-option cluster containing `f`,
 * `--mirror` (which force-updates every ref) or a `+refspec`.
 */
const PLAIN_FORCE_TEXT =
  /\bgit\b[^|;&\n]*\bpush\b[^|;&\n]*(\s--forc?e?(?!-with-lease|-if-includes)\b|\s-[a-zA-Z]*f[a-zA-Z]*\b|\s--mirror\b|\s\+\S)/;
const PLAIN_FORCE =
  'Plain force-push (--force, -f, --mirror, +refspec) is not allowed. To rewrite your own feature branch, use --force-with-lease.';

/** The one allowed lease push; groups are the lease value, remote and branch. */
const LEASE_SHAPE =
  /^git push --force-with-lease(=[^\s$`;|&<>()'"\\]+)?( --force-if-includes)? ([A-Za-z0-9][A-Za-z0-9._-]*) ([A-Za-z0-9][A-Za-z0-9._/-]*)$/;
const PROTECTED_BRANCH = /(^|\/)(main|master)$|(^|\/)release\//i;
const LEASE_REFUSED =
  "A lease push must be a single plain command: `git push --force-with-lease <remote> <feature-branch>` (optionally --force-if-includes), with an explicit branch that is not main, master or release/*. Compound commands, redirects, refspecs with ':' or '*', HEAD/@ and quoted subcommands are refused; run the push on its own.";

/**
 * True when a lease push names an explicit feature branch: not HEAD, and not
 * main, master or release/*. Protected names are matched as a path suffix and
 * case-insensitively, so `heads/main`, `origin/main` and `MAIN` (which resolves
 * to main on a case-insensitive filesystem) are refused as well.
 *
 * @param {string} branch Branch argument of the push.
 */
function isFeatureBranch(branch) {
  return branch !== 'HEAD' && !PROTECTED_BRANCH.test(branch);
}

/**
 * Decide whether a command force-pushes in a way the repo forbids.
 *
 * Client-side shell parsing never catches every form (quoting, `bash -c`, a
 * `cd` or `git switch` before the push, redirects, git global options), so
 * this recognises one allowed shape instead of trying to parse the rest:
 * `git push --force-with-lease[=<expect>] [--force-if-includes] <remote> <branch>`
 * as the whole command, with a feature branch. No git state is consulted.
 *
 * @param {string} command Bash command line from the tool call.
 * @returns {string | null} Denial reason, or null when the command is fine.
 */
function forcePushViolation(command) {
  if (PLAIN_FORCE_TEXT.test(command)) return PLAIN_FORCE;
  if (!command.includes('--force-with-lease')) return null;
  const shape = LEASE_SHAPE.exec(command.trim());
  return shape && isFeatureBranch(shape[4]) ? null : LEASE_REFUSED;
}

for (const [re, reason] of rules) {
  if (re.test(cmd)) deny(`${reason}\n\nBlocked command: ${cmd}`);
}
const forceReason = forcePushViolation(cmd);
if (forceReason) deny(`${forceReason}\n\nBlocked command: ${cmd}`);
allow();
