#!/usr/bin/env node
/**
 * Traceability gate.
 *
 * 1. Every `it(` / `test(` title in a spec file must start with a requirement id
 *    like "[REQ-INVOICE-LIST-003]" so tests can be traced back to the spec.
 * 2. Every requirement id declared in an approved spec under docs/superpowers/specs
 *    must be referenced by at least one test (no untested requirements).
 *
 * Exit 2 on violation (Claude Code hook convention: exit 2 = blocking feedback).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const TEST_FILE = /\.(spec|test)\.(ts|mts)$/;
const TITLE =
  /\b(?:it|test)(?:\.(?:only|skip|fixme|fails|concurrent))?\s*\(\s*(['"`])([^'"`]*)\1/g;
const REQ_ID = /\[(REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3})\]/;
const REQ_DECL =
  /^\s*(?:[-*]|\d+\.)?\s*\**\s*(REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3})\b/gm;
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.nx',
  'coverage',
  '.stryker-tmp',
  'files',
  'tmp',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.git')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(root);
const testFiles = files.filter((f) => TEST_FILE.test(f));
const specDocs = files.filter((f) =>
  /docs\/superpowers\/specs\/.*\.md$/.test(f.replaceAll('\\', '/')),
);

const errors = [];
const referenced = new Set();

for (const file of testFiles) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(TITLE)) {
    const title = m[2];
    const id = REQ_ID.exec(title)?.[1];
    if (!id) {
      errors.push(
        `${relative(root, file)}: test "${title}" has no [REQ-…-NNN] id`,
      );
    } else {
      referenced.add(id);
    }
  }
}

for (const doc of specDocs) {
  const src = readFileSync(doc, 'utf8');
  if (!/^status:\s*approved/im.test(src)) continue; // drafts are exempt
  for (const m of src.matchAll(REQ_DECL)) {
    const id = m[1];
    if (!referenced.has(id)) {
      errors.push(`${relative(root, doc)}: ${id} has no test referencing it`);
    }
  }
}

if (errors.length > 0) {
  console.error(
    'Traceability check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'),
  );
  console.error(
    '\nFix: prefix each test title with its requirement id, and add a test for every REQ in approved specs.',
  );
  process.exit(2);
}
console.log(
  `Traceability OK: ${testFiles.length} test files, ${referenced.size} requirement ids referenced.`,
);
