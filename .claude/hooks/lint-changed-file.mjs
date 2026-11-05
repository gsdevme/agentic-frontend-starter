#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write|MultiEdit): lint + format-check the file that was just written and
 * feed any error back to the agent (exit 2). Fast, file-scoped; the full gate runs on Stop.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { readInput, block, allow } from './_io.mjs';

const input = await readInput();
const filePath = input?.tool_input?.file_path ?? input?.tool_input?.path;
if (!filePath) allow();
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const abs = resolve(root, filePath);
if (!existsSync(abs)) allow();
const rel = relative(root, abs).replaceAll('\\', '/');

const lintable =
  /\.(ts|mts|js|mjs|cjs|html|json)$/.test(rel) &&
  !/^(node_modules|dist|\.nx)\//.test(rel);
if (!lintable) allow();

const problems = [];

const prettierBin = resolve(root, 'node_modules/.bin/prettier');
const prettier = spawnSync(prettierBin, ['--check', abs], {
  cwd: root,
  encoding: 'utf8',
});
if (prettier.status !== 0) {
  spawnSync(prettierBin, ['--write', abs], { cwd: root });
  // Auto-fixed; tell the agent so its view of the file is refreshed.
  problems.push(
    `Formatting of ${rel} was corrected by prettier. Re-read the file before further edits.`,
  );
}

if (/\.(ts|mts|html)$/.test(rel) && /^(apps|packages|tools)\//.test(rel)) {
  // ESLint 9 resolves config from CWD, so run from the nearest project config (what `nx lint` does).
  let cwd = dirname(abs);
  while (cwd !== root && !existsSync(resolve(cwd, 'eslint.config.mjs')))
    cwd = dirname(cwd);
  // Call the binary directly: `pnpm exec` would hop back to the root package.json's directory.
  const eslint = spawnSync(
    resolve(root, 'node_modules/.bin/eslint'),
    ['--no-warn-ignored', '--format', 'stylish', abs],
    {
      cwd,
      encoding: 'utf8',
    },
  );
  if (eslint.status !== 0) {
    problems.push(
      `ESLint errors in ${rel}:\n${(eslint.stdout || eslint.stderr).trim()}`,
    );
  }
}

if (/\.(spec|test)\.(ts|mts)$/.test(rel)) {
  const req = spawnSync('node', ['scripts/verify/require-req-ids.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (req.status !== 0) {
    const mine = req.stderr.split('\n').filter((l) => l.includes(rel));
    if (mine.length) problems.push(`Traceability:\n${mine.join('\n')}`);
  }
}

if (problems.length) block(problems.join('\n\n'));
allow();
