import { readFileSync } from 'node:fs';

import { expect, loadTemplate, test } from './test-utils';

test('can modify template settings', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Single Signature (P2PKH) → Transactions are signed by only a single key.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#template-name').click();
  await page.getByPlaceholder('Template Name').fill('Test');
  await page.locator('#template-description').click();
  await page
    .getByPlaceholder('A brief description of this wallet template...')
    .fill('Powered by Libauth: libauth.org');
  await page
    .locator('label')
    .filter({ hasText: 'BCH_SPEC' })
    .locator('span')
    .first()
    .click();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Done' }).click();
  const link1 = page.getByRole('link', { name: 'libauth.org' });
  await expect(link1).toBeVisible();
  expect(await link1.getAttribute('href')).toEqual('https://libauth.org');
  expect(await link1.getAttribute('target')).toEqual('_blank');
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#template-description').click();
  await page
    .getByPlaceholder('A brief description of this wallet template...')
    .fill('Powered by Libauth: http://libauth.org');
  await page.getByRole('button', { name: 'Done' }).click();
  const link2 = page.getByRole('link', { name: 'http://libauth.org' });
  await expect(link2).toBeVisible();
  expect(await link2.getAttribute('href')).toEqual('http://libauth.org');
  expect(await link2.getAttribute('target')).toEqual('_blank');
});

test('can reset template', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Single Signature (P2PKH) → Transactions are signed by only a single key.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
  await page
    .getByRole('button', { name: 'Reset to a Built-in Template...' })
    .click();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
  await page
    .getByRole('button', { name: 'Reset to a Built-in Template...' })
    .click();
  await page.getByRole('button', { name: 'Reset Project' }).click();
  await expect(
    page.getByRole('heading', { name: 'Choose a template to begin' }),
  ).toBeVisible();
});

test('can download and re-import template', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Single Signature (P2PKH) → Transactions are signed by only a single key.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
  await page.getByRole('button', { name: 'Import/Export Template...' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Template' }).click();
  const download = await downloadPromise;
  const file = download.suggestedFilename();
  const path = `test-results/${file}`;
  const fixture = `tests/fixtures/${file}`;
  expect(file).toBe('single_signature_p2pkh.wallet-template.json');
  await download.saveAs(path);
  expect(
    JSON.parse(readFileSync(path, { encoding: 'utf8' })),
    `The downloaded file at ${path} must be equivalent to the expected file: ${fixture}`,
  ).toStrictEqual(
    JSON.parse(readFileSync(`tests/fixtures/${file}`, { encoding: 'utf8' })),
  );
  await loadTemplate(page, path);
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
});
