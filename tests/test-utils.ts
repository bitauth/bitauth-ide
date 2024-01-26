import { randomBytes } from 'crypto';
import { promises, writeFileSync } from 'fs';
import { join } from 'path';

import { test as baseTest, Page } from '@playwright/test';

const istanbulCLIOutput = join(process.cwd(), '.nyc_output');
const generateUUID = () => randomBytes(16).toString('hex');

/**
 * Based on https://github.com/mxschmitt/playwright-test-coverage
 */
export const preFixturesTest = baseTest.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      window.addEventListener('beforeunload', () =>
        // eslint-disable-next-line
        (window as any).collectIstanbulCoverage(
          // eslint-disable-next-line
          JSON.stringify((window as any).__coverage__),
        ),
      );
    });
    await promises.mkdir(istanbulCLIOutput, { recursive: true });
    await context.exposeFunction(
      'collectIstanbulCoverage',
      (coverageJSON: string) => {
        if (coverageJSON)
          writeFileSync(
            join(
              istanbulCLIOutput,
              `playwright_coverage_${generateUUID()}.json`,
            ),
            coverageJSON,
          );
      },
    );
    await use(context);
    for (const page of context.pages()) {
      await page.evaluate(() =>
        // eslint-disable-next-line
        (window as any).collectIstanbulCoverage(
          // eslint-disable-next-line
          JSON.stringify((window as any).__coverage__),
        ),
      );
    }
  },
});

/**
 * Playwright `test` extended to:
 * - collect code coverage
 * - dismiss the guide and notification popovers before each test
 */
export const test = preFixturesTest.extend({
  page: async ({ page }, use) => {
    /* Mocked to avoid flakiness from the logged 404 error */
    await page.route('/_vercel/insights/script.js', async (route) => {
      await route.fulfill({});
    });
    await page.goto('/');
    await page.evaluate(
      `window.localStorage.setItem('BITAUTH_IDE_GUIDE_POPOVER_DISMISSED', Date.now());
  window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_DISABLE_NOTIFIER', 'true');`,
    );
    await use(page);
  },
});

export const expect = test.expect;

/**
 * Load a wallet template from tests/fixtures into the provided `page`.
 *
 * While we could use Playwright's `extend` behavior to add these fixtures to
 * custom `Page`s, this strategy is less verbose and allows tests to use the
 * typical `page` variable (less confusing for contributors and reviewers).
 */
export const loadTemplate = async (page: Page, path: string) => {
  await page.goto('/');
  await page
    .getByRole('button', {
      name: 'Import or Restore Template → Import or restore a template from a previous session.',
    })
    .click();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('Load from file...').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path);
  await page.getByRole('button', { name: 'Import Template' }).click();
};

/**
 * Occasionally, visual difference testing will fail in webkit due to seemingly
 * non-deterministic font kerning. This utility can be used to eliminate
 * flakiness in tests prone to these failures.
 */
export const fixFontFlakiness = async (page: Page, enable = true) => {
  if (!enable) return;
  await page
    .locator('body')
    .evaluate(
      (element) => (element.style.textRendering = 'geometricPrecision'),
    );
  await page.evaluate(() => document.fonts.ready);
};
