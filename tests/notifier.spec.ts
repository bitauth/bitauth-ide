import { expect, test } from './test-utils';

test('logs welcome message to console, indicates development/production mode', async ({
  page,
}) => {
  let logs = '';
  page.on('console', (msg) => {
    logs += msg.text();
  });
  await page.goto('/');
  await expect(() => {
    expect(logs).toContain('Welcome to Bitauth IDE!');
    expect(logs).toContain(
      process.env.NODE_ENV === 'production'
        ? 'Bitauth IDE is installed locally and ready to use offline.'
        : 'Bitauth IDE is running in development mode.',
    );
  }).toPass();
});

test('displays update notifier when a refresh is needed', async ({ page }) => {
  await page.evaluate(
    `window.localStorage.setItem('BITAUTH_IDE_E2E_TESTING_DISABLE_NOTIFIER', 'false')`,
  );
  await page.waitForFunction(`window._IDE_E2E_TESTING_NOTIFIER !== undefined`);
  await page.evaluate(`window._IDE_E2E_TESTING_NOTIFIER.setNeedRefresh(true)`);
  await expect(page.getByText('This version of Bitauth IDE')).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Later' }).click();
  await expect(page.getByText('This version of Bitauth IDE')).not.toBeVisible();
});

test('Update notifier can reload the page', async ({ page }) => {
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
