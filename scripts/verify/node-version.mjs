#!/usr/bin/env node
/**
 * Node version gate: `.nvmrc` is the single source of truth for the Node major (ADR 0002).
 *
 * Fails (exit 1) when:
 *   - the running Node major differs from `.nvmrc`;
 *   - the root `Dockerfile` pins a different major, via an `ARG NODE_MAJOR=<n>` default or a
 *     literal `node:<n>-` / `nodejs<n>-` image tag;
 *   - the `Dockerfile` pins no major at all, or has a Node `FROM` line pinned by neither a literal
 *     major nor `${NODE_MAJOR}` (e.g. `node:lts`), so the check cannot pass vacuously.
 *
 * Paths resolve from this file's location, not the working directory, so the gate behaves the
 * same from hooks, CI and a subdirectory shell.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const nvmrc = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
const expected = /^v?(\d+)/.exec(nvmrc)?.[1];
const errors = [];

if (!expected) {
  console.error(
    `✘ .nvmrc must start with a Node major version, got "${nvmrc}".`,
  );
  process.exit(1);
}

const running = process.versions.node.split('.')[0];
if (running !== expected) {
  errors.push(
    `running Node ${process.versions.node} (major ${running}), but .nvmrc pins major ${expected}. ` +
      'Run `nvm use` or `fnm use` in the repo root, then retry.',
  );
}

const dockerfile = readFileSync(join(root, 'Dockerfile'), 'utf8');
const pins = [
  ...dockerfile.matchAll(/^\s*ARG\s+NODE_MAJOR=(\d+)\s*$/gm),
  ...dockerfile.matchAll(/\bnode:(\d+)-/g),
  ...dockerfile.matchAll(/\bnodejs(\d+)-/g),
].map(([match, major]) => ({ match: match.trim(), major }));
const unpinnedFroms = [
  ...dockerfile.matchAll(/^\s*FROM\s+(\S*node(?:js)?\S*)/gim),
]
  .map(([, image]) => image)
  .filter(
    (image) =>
      !/\bnode:\d+-|\bnodejs\d+-/.test(image) &&
      !/node(?:js|:)\$\{?NODE_MAJOR\}?/.test(image),
  );

if (pins.length === 0) {
  errors.push(
    'Dockerfile pins no Node major (no `ARG NODE_MAJOR=<n>`, `node:<n>-` or `nodejs<n>-`); the check cannot run.',
  );
}
for (const { match, major } of pins) {
  if (major !== expected) {
    errors.push(`Dockerfile has "${match}" but .nvmrc pins major ${expected}.`);
  }
}
for (const image of unpinnedFroms) {
  errors.push(
    `Dockerfile FROM "${image}" is not pinned to a Node major; use \`\${NODE_MAJOR}\` or a literal major.`,
  );
}

if (errors.length > 0) {
  console.error(`✘ Node version check failed:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(
  `✔ Node ${process.versions.node} matches .nvmrc (${expected}); Dockerfile agrees (${pins.length} pin(s)).`,
);
