#!/usr/bin/env node
/**
 * PreToolUse(Bash): block commands that bypass verification or rewrite history.
 * This is a backstop for the deny rules in settings.json (deny rules can be
 * overridden by a user's local settings; a hook cannot be, and it survives
 * --dangerously-skip-permissions).
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
    /\bgit\s+push\b[^|;&]*\s(--force|-f|--force-with-lease)\b/,
    'Force-push is not allowed. Create a new commit.',
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

for (const [re, reason] of rules) {
  if (re.test(cmd)) deny(`${reason}\n\nBlocked command: ${cmd}`);
}
allow();
