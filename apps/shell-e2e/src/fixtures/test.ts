import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Shared Playwright fixtures.
 *
 * - `axe`: run WCAG 2.2 AA checks on the current page. Zero violations is the bar.
 * - `consoleErrors`: collects console errors / page errors; tests assert it is empty.
 */
type Fixtures = {
  axe: () => Promise<void>;
  consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
  axe: async ({ page }, use) => {
    await use(async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`,
        ),
        'axe-core violations',
      ).toEqual([]);
    });
  },
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });
    await use(errors);
  },
});

export { expect };
