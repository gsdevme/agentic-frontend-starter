#!/usr/bin/env node
/**
 * Installs the Claude Code plugins that `.claude/settings.json` enables, in cloud sessions only.
 * Runs from the `prepare` script, so `pnpm install` is the one bootstrap for a fresh container.
 *
 * A local session offers to install enabled plugins when the folder is trusted. A cloud container
 * starts with none and nobody is there to answer, so the skills AGENTS.md relies on (superpowers,
 * nx) would be missing.
 *
 * Plugins load when a session starts: an install made here is picked up by the next session in
 * the container (or after /reload-plugins), not by the session that ran `pnpm install`.
 *
 * Never fails an install: every problem is reported and ignored.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.CLAUDE_CODE_REMOTE !== 'true') process.exit(0);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const claude = (args) =>
  spawnSync('claude', ['plugin', ...args], {
    // Outside the checkout, so the CLI can never rewrite the project settings.
    cwd: homedir(),
    encoding: 'utf8',
    timeout: 120_000,
  });

let settings;
let installed;
try {
  settings = JSON.parse(
    readFileSync(join(root, '.claude', 'settings.json'), 'utf8'),
  );
  installed = new Set(
    JSON.parse(claude(['list', '--json']).stdout).map((p) => p.id),
  );
} catch {
  // No settings, no claude CLI on PATH, or output we can't read: nothing to do.
  process.exit(0);
}

const missing = Object.entries(settings.enabledPlugins ?? {})
  .filter(([id, enabled]) => enabled === true && !installed.has(id))
  .map(([id]) => id);
if (!missing.length) process.exit(0);

const marketplaces = settings.extraKnownMarketplaces ?? {};
const done = [];
const failed = [];
for (const id of missing) {
  const source = marketplaces[id.split('@')[1]]?.source;
  if (source?.source === 'github' && source.repo) {
    claude(['marketplace', 'add', source.repo]);
  }
  (claude(['install', id]).status === 0 ? done : failed).push(id);
}

if (done.length) {
  console.log(
    `Installed Claude Code plugins: ${done.join(', ')}. Their skills load from the next session start or after /reload-plugins.`,
  );
}
if (failed.length) {
  console.warn(
    `Could not install Claude Code plugins: ${failed.join(', ')}. Run \`claude plugin install <id>\` to see why.`,
  );
}
