import { expect, test } from './test-utils';

test('product screenshots: recoverable vault', async ({ page }) => {
  await page
    .getByRole('button', {
      name: '2-of-2 Recoverable Vault → Transactions require either both co-owners to sign, or after a delay, one co-owner and another trusted party.',
    })
    .click();
  await expect(page).toHaveScreenshot('template-settings.png', {
    scale: 'device',
  });
  await expect(page.locator('h1 .title')).toHaveText(
    '2-of-2 Recoverable Vault',
  );
  await page.getByRole('button', { name: 'Import/Export Template...' }).click();
  await expect(
    page.locator('.detected-link').getByText('https://ide.bitauth.com/'),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('template-import-export.png', {
    scale: 'device',
  });
  await page.getByLabel('Close').click();
  await page.getByRole('button', { name: 'Signer 1', exact: true }).click();
  await expect(page).toHaveScreenshot('entity-settings.png', {
    scale: 'device',
  });
  await page.getByRole('button', { name: 'Recover – Signer 1' }).click();
  await expect(page).toHaveScreenshot('script-editor.png', {
    scale: 'device',
  });
});

test('product screenshots: scratch pad', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Scratch Pad → A blank slate, ready for some creative genius.',
    })
    .click();
  await page.waitForFunction(
    `window._IDE_E2E_TESTING_VIEW_CONFIG !== undefined`,
  );
  await page.evaluate(
    `window._IDE_E2E_TESTING_VIEW_CONFIG.setScriptEditorWidths(50)`,
  );
  await expect(page).toHaveScreenshot('scratch-pad.png', {
    scale: 'device',
  });
});
