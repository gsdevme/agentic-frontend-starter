#!/usr/bin/env node
/**
 * PreToolUse(Edit|Write|MultiEdit): enforce file ownership.
 *
 *  - Guardrail config (lint, boundaries, hooks, CI, constitution) is human-owned.
 *  - Approved specs are immutable to agents (append a new spec or ask for re-approval).
 *  - Acceptance tests (apps/*-e2e) may be CREATED by the acceptance-author step but not
 *    modified in the same session that edits implementation, unless ALLOW_ACCEPTANCE_EDIT=1
 *    was set by the human.
 *  - Generated outputs are never hand-edited.
 */
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { readInput, deny, allow } from './_io.mjs';

const input = await readInput();
const filePath = input?.tool_input?.file_path ?? input?.tool_input?.path;
if (!filePath) allow();

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const rel = relative(root, resolve(root, filePath)).replaceAll('\\', '/');
const exists = existsSync(resolve(root, filePath));

const humanOwned = [
  /^\.claude\/(settings\.json|hooks\/)/,
  /^\.github\/workflows\//,
  /^eslint(\.angular)?\.config\.mjs$|^eslint\.angular\.mjs$/,
  /^\.dependency-cruiser\.cjs$/,
  /^knip\.json$/,
  /^stryker\.config\.mjs$/,
  /^docs\/constitution\.md$/,
  /^docs\/architecture\/scopes\.md$/,
  /^tsconfig\.base\.json$/,
];
for (const re of humanOwned) {
  if (re.test(rel)) {
    deny(
      `${rel} is human-owned guardrail configuration. Describe the change you need in the PR / plan instead of editing it.`,
    );
  }
}

if (/^packages\/shared\/design-tokens\/src\//.test(rel)) {
  deny(
    `${rel} is generated. Edit packages/shared/design-tokens/tokens/*.json and run pnpm tokens.`,
  );
}

if (/^docs\/superpowers\/specs\/.+\.md$/.test(rel) && exists) {
  const src = readFileSync(resolve(root, filePath), 'utf8');
  if (/^status:\s*approved/im.test(src)) {
    deny(
      `${rel} is an APPROVED spec and is immutable to agents. Write a new dated spec that supersedes it, or ask the human to change its status to draft.`,
    );
  }
}

if (
  /^apps\/[^/]+-e2e\/src\/.+\.spec\.ts$/.test(rel) &&
  exists &&
  !process.env.ALLOW_ACCEPTANCE_EDIT
) {
  deny(
    `${rel} is an acceptance test (human-owned oracle). Adding new acceptance files is fine; editing existing ones needs the human to set ALLOW_ACCEPTANCE_EDIT=1 after a spec change.`,
  );
}

if (
  /^tools\/workspace-plugin\/src\/generators\/.+\/files\//.test(rel) &&
  !process.env.ALLOW_GENERATOR_EDIT
) {
  deny(
    `${rel} is a generator template; changing it changes every future feature. Propose the change in docs/adr/ and ask the human to set ALLOW_GENERATOR_EDIT=1.`,
  );
}

allow();
