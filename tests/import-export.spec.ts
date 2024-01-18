import { expect, test } from './test-utils';

test('import template from file', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', {
      name: 'Import or Restore Template → Import or restore a template from a previous session.',
    })
    .click();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('Load from file...').click();
  const fileChooser = await fileChooserPromise;
  expect(fileChooser.isMultiple()).toBe(false);
  await fileChooser.setFiles('src/templates/2-of-3.json');
  await expect(page.getByText('"2-of-3 Multisig"')).toBeVisible();
  await expect(page.locator('.detected-link').first()).toBeHidden();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Import Template' }).click();
  await expect(page.locator('h1 .title')).toHaveText('2-of-3 Multisig');
});

test('shows JSON errors', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', {
      name: 'Import or Restore Template → Import or restore a template from a previous session.',
    })
    .click();
  await page.getByText('{').first().click();
  await page.keyboard.insertText('_ERR');
  await expect(page.getByText('There is an unresolved issue.')).toBeVisible();
  await page
    .getByRole('heading', { name: 'Import/Export Wallet Template' })
    .hover(); /* avoid any hover styling in editor */
  await expect(page).toHaveScreenshot();
  await page.getByText('(show)').click();
  await expect(
    page.getByText('Expected a JSON object, array or literal.'),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page
    .getByRole('listitem', { name: 'Close' })
    .getByLabel('Close')
    .click();
  await page.getByText('{').first().click();
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(page.getByText('There is an unresolved issue.')).toBeHidden();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.insertText('_ERR');
  await expect(page.getByText('There are 2 unresolved issues.')).toBeVisible();
});

test('exports working share links', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', {
      name: 'Single Signature (P2PKH) → Transactions are signed by only a single key.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
  await page.getByRole('button', { name: 'Import/Export Template...' }).click();
  await page.getByRole('button', { name: 'Share Link...' }).click();
  const shareLink = await page.locator('.sharing-link').inputValue();
  expect(shareLink).toContain('/import-template/');
  await page.goto(shareLink);
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
});
