#!/usr/bin/env node
/**
 * Anti-gaming gate for the diff under review (defaults to HEAD vs merge-base with main).
 *
 * Fails (exit 2) when the diff:
 *  - deletes or renames a test file
 *  - reduces the number of `it(`/`test(` cases in an existing test file
 *  - removes `expect(` calls from an existing test file
 *  - edits a Playwright acceptance file under apps/*-e2e/ while also editing implementation
 *    (acceptance tests are the human-owned oracle; change them in a separate PR)
 *
 * Usage: node scripts/verify/no-test-weakening.mjs [baseRef]
 */
import { execSync } from 'node:child_process';

const base =
  process.argv[2] ??
  (() => {
    try {
      return execSync('git merge-base HEAD origin/main', { stdio: 'pipe' })
        .toString()
        .trim();
    } catch {
      try {
        return execSync('git merge-base HEAD main', { stdio: 'pipe' })
          .toString()
          .trim();
      } catch {
        return 'HEAD~1';
      }
    }
  })();

const sh = (cmd) => execSync(cmd, { stdio: 'pipe' }).toString();
const nameStatus = sh(`git diff --name-status ${base} -- . ':!node_modules'`)
  .trim()
  .split('\n')
  .filter(Boolean);
const errors = [];
const isTest = (f) => /\.(spec|test)\.(ts|mts)$/.test(f);
const isE2E = (f) => /^apps\/[^/]+-e2e\/src\/.*\.spec\.ts$/.test(f);
const count = (src, re) => (src.match(re) ?? []).length;
const CASES = /\b(?:it|test)\s*\(/g;
const EXPECTS = /\bexpect\s*(?:\.soft)?\s*\(/g;

let touchedImpl = false;
let touchedE2E = false;

for (const line of nameStatus) {
  const [status, a, b] = line.split('\t');
  const file = b ?? a;
  if (status.startsWith('D') && isTest(a))
    errors.push(`deleted test file ${a}`);
  if (status.startsWith('R') && isTest(a))
    errors.push(`renamed test file ${a} → ${b}`);
  if (status.startsWith('M') && isTest(file)) {
    const before = sh(`git show ${base}:${file}`);
    const after = sh(`git show HEAD:${file} 2>/dev/null || cat ${file}`);
    const dc = count(after, CASES) - count(before, CASES);
    const de = count(after, EXPECTS) - count(before, EXPECTS);
    if (dc < 0) errors.push(`${file}: ${-dc} test case(s) removed`);
    if (de < 0) errors.push(`${file}: ${-de} expect() call(s) removed`);
  }
  if (isE2E(file)) touchedE2E = true;
  else if (/^(apps|packages)\/.*\.(ts|html|css)$/.test(file) && !isTest(file))
    touchedImpl = true;
}

if (touchedE2E && touchedImpl && !process.env['ALLOW_ACCEPTANCE_EDIT']) {
  errors.push(
    'acceptance tests (apps/*-e2e) and implementation changed in the same diff; split them (set ALLOW_ACCEPTANCE_EDIT=1 for an approved spec change)',
  );
}

if (errors.length) {
  console.error(
    `Test-weakening check failed (base ${base}):\n` +
      errors.map((e) => `  - ${e}`).join('\n'),
  );
  process.exit(2);
}
console.log(
  `Test-weakening check OK (base ${base}, ${nameStatus.length} changed files).`,
);
