import { expect, test } from './test-utils';

test('displays update notifier, can delay update', async ({ page }) => {
  await page.evaluate(
    `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_DISABLE_NOTIFIER', 'false')`,
  );
  await page.evaluate(
    `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_ANALYTICS_ENABLE', 'true')`,
  );
  await page.waitForFunction(`window._IDE_E2E_TESTING_NOTIFIER !== undefined`);
  await page.evaluate(
    `window._IDE_E2E_TESTING_NOTIFIER.setRequestConsent(true)`,
  );
  await page.evaluate(`window._IDE_E2E_TESTING_NOTIFIER.setNeedRefresh(true)`);
  await expect(page.getByText('This version of Bitauth IDE')).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByText('This version of Bitauth IDE')).not.toBeVisible();
});

test('update notifier can reload the page', async ({ page }) => {
  await page.evaluate(
    `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_DISABLE_NOTIFIER', 'false')`,
  );
  await page.waitForFunction(`window._IDE_E2E_TESTING_NOTIFIER !== undefined`);
  await page.evaluate(`window._IDE_E2E_TESTING_NOTIFIER.setNeedRefresh(true)`);
  await expect(page.getByText('This version of Bitauth IDE')).toBeVisible();
  let logs = '';
  page.on('console', (msg) => {
    logs += msg.text();
  });
  await page.getByRole('button', { name: 'Reload' }).click();
  await expect(() => {
    expect(logs).toContain('Notifier triggered reload.');
  }).toPass();
});

test('displays telemetry consent request, can decline', async ({ page }) => {
  await page.evaluate(
    `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_DISABLE_NOTIFIER', 'false')`,
  );
  await page.evaluate(
    `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_ANALYTICS_ENABLE', 'true')`,
  );
  await page.waitForFunction(`window._IDE_E2E_TESTING_NOTIFIER !== undefined`);
  await page.evaluate(
    `window._IDE_E2E_TESTING_NOTIFIER.setRequestConsent(true)`,
  );
  await expect(page.getByText('sharing usage information')).toBeVisible();
  await expect(page).toHaveScreenshot();
  let logs = '';
  page.on('console', (msg) => {
    logs += msg.text();
  });
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByText('sharing usage information')).not.toBeVisible();
  await expect(() => {
    expect(logs).toContain('Telemetry disabled.');
  }).toPass();
  if (process.env.NODE_ENV === 'production') {
    let logs = '';
    page.on('console', (msg) => {
      logs += msg.text();
    });
    await page.goto('/');
    await expect(() => {
      expect(logs).toContain('You disabled telemetry at');
    }).toPass();
  }
});

test('can accept telemetry consent request', async ({ page }) => {
  await page.evaluate(
    `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_DISABLE_NOTIFIER', 'false')`,
  );
  await page.evaluate(
    `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_ANALYTICS_ENABLE', 'true')`,
  );
  await page.waitForFunction(`window._IDE_E2E_TESTING_NOTIFIER !== undefined`);
  await page.evaluate(
    `window._IDE_E2E_TESTING_NOTIFIER.setPrioritizeReload(false)`,
  );
  await page.evaluate(
    `window._IDE_E2E_TESTING_NOTIFIER.setRequestConsent(true)`,
  );
  await expect(page.getByText('sharing usage information')).toBeVisible();
  let logs = '';
  page.on('console', (msg) => {
    logs += msg.text();
  });
  await page.getByRole('button', { name: 'Enable Sharing' }).click();
  await expect(page.getByText('sharing usage information')).not.toBeVisible();
  await expect(() => {
    expect(logs).toContain('Telemetry enabled.');
  }).toPass();
  if (process.env.NODE_ENV === 'production') {
    let logs = '';
    page.on('console', (msg) => {
      logs += msg.text();
    });
    await page.goto('/');
    await expect(() => {
      expect(logs).toContain('You enabled telemetry at');
    }).toPass();
  }
});
