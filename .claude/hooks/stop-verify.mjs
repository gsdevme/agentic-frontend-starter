#!/usr/bin/env node
/**
 * Stop: the agent may not end its turn while the quick verification gate fails.
 * Exit 2 keeps the conversation going with the failure output as feedback.
 * `stop_hook_active` guards against infinite loops: if we already blocked once and
 * the agent is still failing, we let it stop but say so loudly.
 */
import { spawnSync } from 'node:child_process';
import { readInput, block, allow } from './_io.mjs';

const input = await readInput();
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// Nothing changed in the working tree → nothing to verify.
const status = spawnSync('git', ['status', '--porcelain'], {
  cwd: root,
  encoding: 'utf8',
});
if (status.status === 0 && status.stdout.trim() === '') allow();

const run = spawnSync('pnpm', ['verify:quick'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, CI: '1' },
});
if (run.status === 0) allow();

const tail = (run.stdout + '\n' + run.stderr).split('\n').slice(-60).join('\n');
if (input?.stop_hook_active) {
  process.stdout.write(
    JSON.stringify({
      systemMessage:
        'verify:quick is STILL failing after a retry. Work is not complete. Human attention needed.',
    }),
  );
  process.exit(0);
}
block(
  `pnpm verify:quick failed. Fix the issues below, then try to finish again. Do not claim completion.\n\n${tail}`,
);
