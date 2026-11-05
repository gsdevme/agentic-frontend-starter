#!/usr/bin/env node
/**
 * Points git at the committed hooks in .githooks/ (runs from the `prepare` script on install).
 * Git hooks are the layer below Claude Code hooks: they apply to every committer and every agent
 * harness, not only Claude Code.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!existsSync('.git') || process.env.CI) process.exit(0);
spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
  stdio: 'ignore',
});
