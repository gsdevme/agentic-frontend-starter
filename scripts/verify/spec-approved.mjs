#!/usr/bin/env node
/**
 * Spec gate: every spec in docs/superpowers/specs must declare a Status line, and every
 * plan in docs/superpowers/plans must point at an approved spec. Exit 2 on violation.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const specsDir = 'docs/superpowers/specs';
const plansDir = 'docs/superpowers/plans';
const errors = [];
const list = (d) =>
  existsSync(d)
    ? readdirSync(d).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    : [];

for (const f of list(specsDir)) {
  const src = readFileSync(join(specsDir, f), 'utf8');
  if (!/^status:\s*(draft|in-review|approved|superseded)\s*$/im.test(src)) {
    errors.push(
      `${specsDir}/${f}: missing "Status: draft|in-review|approved|superseded" line`,
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+-design\.md$/.test(f)) {
    errors.push(`${specsDir}/${f}: name must be YYYY-MM-DD-<topic>-design.md`);
  }
}

for (const f of list(plansDir)) {
  const src = readFileSync(join(plansDir, f), 'utf8');
  const spec = /^\*{0,2}spec:?\*{0,2}:?\s*`?([^\s`]+\.md)`?/im.exec(src)?.[1];
  if (!spec) {
    errors.push(`${plansDir}/${f}: no "Spec: <path>" header`);
    continue;
  }
  if (!existsSync(spec)) {
    errors.push(`${plansDir}/${f}: spec ${spec} does not exist`);
    continue;
  }
  if (!/^status:\s*approved/im.test(readFileSync(spec, 'utf8'))) {
    errors.push(`${plansDir}/${f}: spec ${spec} is not approved`);
  }
}

if (errors.length) {
  console.error(
    'Spec gate failed:\n' + errors.map((e) => `  - ${e}`).join('\n'),
  );
  process.exit(2);
}
console.log('Spec gate OK.');
