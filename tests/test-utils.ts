import { randomBytes } from 'crypto';
import { promises, writeFileSync } from 'fs';
import { join } from 'path';

import { test as baseTest, Locator, Page } from '@playwright/test';

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
 * - dismiss the guide popover before each test
 */
export const test = preFixturesTest.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate(
      `window.localStorage.setItem('BITAUTH_IDE_GUIDE_POPOVER_DISMISSED', Date.now());`,
    );
    await page.evaluate(
      `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_DISABLE_NOTIFIER', 'true');`,
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

const timeout = (ms: number) => {
  const state = {
    done: false,
    promise: new Promise((res) => setTimeout(res, ms)).then(() => {
      state.done = true;
    }),
  };
  return state;
};

/**
 * A utility to scroll within a container until another element becomes visible.
 *
 * Note, scrolling with Playwright's `mouse.wheel` is not supported in
 * mobile WebKit.
 */
export const scrollUntil = async (
  /**
   * A Playwright {@link Page}
   */
  page: Page,
  /**
   * A locator for the element in which to scroll
   */
  scrollContainer: Locator,
  /**
   * A locator for the element to which the container should scroll
   */
  scrollUntilVisible: Locator,
  options: {
    /**
     * Pixels to scroll horizontally for each `wheel` event
     */
    deltaX: number;
    /**
     * Pixels to scroll vertically for each `wheel` event
     */
    deltaY: number;
    /**
     * The delay in milliseconds after which the operation will abort
     */
    timeout: number;
  } = {
    deltaX: 0,
    deltaY: 100,
    timeout: 5_000,
  },
) => {
  const indefinite = options.timeout === 0;
  const timer = timeout(options.timeout);
  await scrollContainer.hover();
  while (
    (indefinite || !timer.done) &&
    !(await scrollUntilVisible.isVisible())
  ) {
    await page.mouse.wheel(options.deltaX, options.deltaY);
  }
  await page.mouse.wheel(options.deltaX, options.deltaY);
};
