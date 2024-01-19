import { expect, test } from './test-utils';

test('autosaves after every action', async ({ page, isMobile }) => {
  await page.goto('/');
  let logs = '';
  page.on('console', (msg) => {
    logs += msg.text();
  });
  await page
    .getByRole('button', {
      name: 'Scratch Pad → A blank slate, ready for some creative genius.',
    })
    .click();
  expect(logs).toContain(
    'Automatically saving work to local storage key: BITAUTH_IDE_BACKUP_',
  );
  const storageKey1 = logs.match(/BITAUTH_IDE_BACKUP_[^ ]*/)?.[0];
  expect(storageKey1).toBeTruthy();
  expect(
    await page.evaluate(`window.localStorage['${storageKey1}']`),
  ).toContain('🌎');
  await page.getByText('🌎').first().click();
  if (isMobile) {
    /**
     * On mobile, the editor requires another tap to move the cursor to the
     * expected location:
     */
    await page.getByText('🌎').first().click();
  }
  await page.locator('.editor textarea').press('ArrowRight');
  await page.locator('.editor textarea').press('!');
  await page.waitForFunction(
    `window.localStorage['${storageKey1}']?.includes('🌎!')`,
  );
  expect(
    await page.evaluate(`window.localStorage['${storageKey1}']`),
  ).toContain('🌎!');
  await page.goto('/');
  await page
    .getByRole('button', {
      name: 'Import or Restore Template → Import or restore a template from a previous session.',
    })
    .click();
  await page.getByRole('button', { name: 'Restore from Autosave...' }).click();
  await expect(page.locator('#backups')).toContainText('– Untitled');
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await page.getByText('Paste a template below to import.').click();
  await expect(page.locator('.detected-link').first()).toBeVisible();
  await page.getByText('Paste a template below to import.').click();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Import Template' }).click();
  await expect(page.locator('h1 .title')).toHaveText('Untitled');
  await page.getByRole('button', { name: 'Scratch Pad' }).click();
  await expect(page.getByText('🌎!').first()).toBeVisible();
  await expect(page).toHaveScreenshot();
});
