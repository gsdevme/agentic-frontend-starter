import { test, expect } from './fixtures/test';

/**
 * SSR contract for the shell. These are infrastructure acceptance tests and apply
 * to every route a feature adds (copy the pattern into <feature>.spec.ts).
 *
 * [REQ-SSR-001] The server renders meaningful HTML without JavaScript.
 * [REQ-SSR-002] Hydration completes with no console or page errors.
 * [REQ-SSR-003] The rendered page has no WCAG 2.2 AA violations.
 * [REQ-SSR-004] /healthz answers 200 for orchestrators and CI.
 */
test.describe('shell SSR contract', () => {
  test('[REQ-SSR-001] renders server-side HTML with JavaScript disabled', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('app-main')).toBeVisible();
    await expect(page.getByTestId('app-title')).toHaveText('Starter');
    const html = await page.content();
    expect(html).toContain('ng-server-context');
    await context.close();
  });

  test('[REQ-SSR-002] hydrates without console or page errors', async ({
    page,
    consoleErrors,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-main')).toBeVisible();
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            document.querySelector('app-root')?.hasAttribute('ng-version'),
          ),
        {
          message: 'Angular should finish bootstrapping on the client',
        },
      )
      .toBe(true);
    expect(consoleErrors).toEqual([]);
  });

  test('[REQ-SSR-003] has no WCAG 2.2 AA violations', async ({ page, axe }) => {
    await page.goto('/');
    await axe();
  });

  test('[REQ-SSR-004] exposes a liveness endpoint', async ({ request }) => {
    const res = await request.get('/healthz');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
