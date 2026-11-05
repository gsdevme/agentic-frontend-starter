import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

/**
 * E2E runs against the PRODUCTION SSR server, never the dev server, so what is
 * tested is what ships: server-rendered HTML, hydration, and client navigation.
 * `pnpm nx e2e shell-e2e` builds the app first (see project.json dependsOn).
 */
const port = Number(process.env['PORT'] ?? 4000);
const baseURL = process.env['BASE_URL'] ?? `http://localhost:${port}`;
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  fullyParallel: true,
  forbidOnly: true, // `.only` never reaches CI (also linted)
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [
        ['github'],
        [
          'html',
          {
            open: 'never',
            outputFolder: '../../dist/.playwright/apps/shell-e2e/report',
          },
        ],
        [
          'json',
          { outputFile: '../../dist/.playwright/apps/shell-e2e/results.json' },
        ],
      ]
    : [
        ['list'],
        [
          'html',
          {
            open: 'never',
            outputFolder: '../../dist/.playwright/apps/shell-e2e/report',
          },
        ],
      ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `PORT=${port} node dist/apps/shell/server/server.mjs`,
    url: `${baseURL}/healthz`,
    reuseExistingServer: !isCI,
    cwd: workspaceRoot,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Add firefox / webkit / mobile projects when the spec requires them.
  ],
});
