#!/usr/bin/env node
/** SessionStart: inject volatile context that doesn't belong in AGENTS.md. */
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const sh = (cmd, args) =>
  spawnSync(cmd, args, { cwd: root, encoding: 'utf8' }).stdout.trim();
const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const dirty = sh('git', ['status', '--porcelain'])
  .split('\n')
  .filter(Boolean).length;
const specs = existsSync(`${root}/docs/superpowers/specs`)
  ? readdirSync(`${root}/docs/superpowers/specs`).filter(
      (f) => f.endsWith('.md') && !f.startsWith('_'),
    )
  : [];
const plans = existsSync(`${root}/docs/superpowers/plans`)
  ? readdirSync(`${root}/docs/superpowers/plans`).filter(
      (f) => f.endsWith('.md') && !f.startsWith('_'),
    )
  : [];

const lines = [
  `Branch: ${branch} (${dirty} uncommitted change${dirty === 1 ? '' : 's'})`,
  `Specs: ${specs.length ? specs.join(', ') : 'none'}`,
  `Plans: ${plans.length ? plans.join(', ') : 'none'}`,
  'Reminder: no completion claim without fresh `pnpm verify` output; the Stop hook enforces verify:quick.',
];
process.stdout.write(lines.join('\n'));
