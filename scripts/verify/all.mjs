#!/usr/bin/env node
/**
 * THE verification entry point. Hooks, CI and agents all call this; nothing else
 * decides whether work is "done". Runs the cheap gates first and stops at the first
 * failing stage so feedback is fast. Exit code is non-zero on any failure.
 *
 *   pnpm verify            # affected projects (local / agent loop)
 *   pnpm verify --all      # everything (CI, release)
 *   pnpm verify --quick    # format + lint + typecheck + unit only (PostToolUse hook)
 */
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const all = args.has('--all');
const quick = args.has('--quick');
const scope = all ? 'run-many' : 'affected';
const nx = (targets, extra = '') =>
  `pnpm exec nx ${scope} -t ${targets} --parallel=3 ${extra}`.trim();

const stages = [
  ['spec gate', 'node scripts/verify/spec-approved.mjs'],
  ['format', 'pnpm exec nx format:check --all'],
  ['lint', nx('lint')],
  ['typecheck (build libs)', nx('build', '--exclude=shell')],
  ['unit tests', nx('test')],
  ['traceability', 'node scripts/verify/require-req-ids.mjs'],
  ...(quick
    ? []
    : [
        [
          'dependency graph',
          'pnpm exec depcruise apps packages tools --config .dependency-cruiser.cjs',
        ],
        ['dead code', 'pnpm exec knip'],
        ['design tokens fresh', 'pnpm exec nx run design-tokens:check-fresh'],
        ['SSR build', 'pnpm exec nx run shell:build'],
        ['acceptance (e2e)', 'pnpm exec nx run shell-e2e:e2e'],
        ['test weakening', 'node scripts/verify/no-test-weakening.mjs'],
      ]),
];

const started = Date.now();
for (const [name, cmd] of stages) {
  const t = Date.now();
  process.stdout.write(`\n▶ ${name}: ${cmd}\n`);
  const r = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, CI: process.env.CI ?? '1' },
  });
  if (r.status !== 0) {
    console.error(
      `\n✘ verify failed at stage "${name}" after ${((Date.now() - t) / 1000).toFixed(1)}s. Fix it, then run \`pnpm verify\` again.`,
    );
    process.exit(r.status ?? 1);
  }
}
console.log(
  `\n✔ verify passed (${stages.length} stages, ${((Date.now() - started) / 1000).toFixed(1)}s)`,
);
