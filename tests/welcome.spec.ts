import { expect, fixFontFlakiness, preFixturesTest, test } from './test-utils';

preFixturesTest(
  'loads the welcome screen and guide',
  async ({ page, browserName }) => {
    await page.goto('/');
    await fixFontFlakiness(page, browserName === 'webkit');
    await expect(
      page.getByRole('heading', { name: 'Choose a template to begin' }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot();
    await expect(
      page.getByText('New to Bitauth IDE? Check out the guide!'),
    ).toBeVisible(); /* Approx. 3 second delay */
    await expect(page).toHaveScreenshot();
    await page.getByText('bitauth', { exact: true }).click();
    await page
      .getByRole('heading', { name: 'Choose a template to begin' })
      .click();
    await expect(
      page.getByText('New to Bitauth IDE? Check out the guide!'),
    ).toBeHidden();
    expect(
      await page.evaluate(
        `window.localStorage['BITAUTH_IDE_GUIDE_POPOVER_DISMISSED']`,
      ),
    ).toBeTruthy();
    await page.getByRole('button', { name: 'Guide' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
    /* Remove focus styling before screenshot: */
    await page.getByRole('heading', { name: 'Welcome!' }).click();
    await expect(page).toHaveScreenshot({ fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeHidden();
  },
);

test('loads the single signature template', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Single Signature (P2PKH) → Transactions are signed by only a single key.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Unlock' }).click();
  /**
   * Verify that syntax highlighting is working
   */
  await expect(page.getByText('OP_DUP').first()).toHaveCSS(
    'color',
    'rgb(60, 157, 218)',
  );
  await expect(page.getByText('OP_EQUALVERIFY').first()).toHaveCSS(
    'color',
    'rgb(217, 218, 162)',
  );
  await expect(page).toHaveScreenshot();
  await page.getByText('OP_DUP').first().hover();
  await expect(
    page.getByText('Duplicate the top item on the stack.'),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
});

test('loads the multisig template', async ({ page }) => {
  await page
    .getByRole('button', {
      name: '2-of-3 Multi-Signature → Transactions require any two of three co-owners to sign.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText('2-of-3 Multisig');
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Cosigner 1 & 2' }).click();
  await expect(
    page.getByRole('heading', { name: 'Cosigner 1 & 2 P2SH' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Cosigner 2 & 3' }).click();
  await expect(
    page.getByRole('heading', { name: 'Cosigner 2 & 3 P2SH' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
});

test('loads the recoverable vault template', async ({ page }) => {
  await page
    .getByRole('button', {
      name: '2-of-2 Recoverable Vault → Transactions require either both co-owners to sign, or after a delay, one co-owner and another trusted party.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText(
    '2-of-2 Recoverable Vault',
  );
  await page.getByRole('button', { name: 'Recover – Signer 2' }).click();
  await expect(
    page.getByRole('heading', { name: 'Recover – Signer 2 P2SH' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Standard Spend' }).click();
  await expect(
    page.getByRole('heading', { name: 'Standard Spend P2SH' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
});

test('loads the scratch pad template', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Scratch Pad → A blank slate, ready for some creative genius.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText('Untitled');
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Untitled' }).click();
  await expect(
    page.getByRole('heading', { name: 'Untitled Edit' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
});

test('can import a template', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Import or Restore Template → Import or restore a template from a previous session.',
    })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Import/Export Wallet Template',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Import Template' }),
  ).toBeDisabled();
  await expect(page.locator('.detected-link').first()).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByLabel('Close').click();
  await expect(
    page.getByRole('heading', {
      name: 'Import/Export Wallet Template',
    }),
  ).toBeHidden();
  await page
    .getByRole('button', {
      name: 'Import or Restore Template → Import or restore a template from a previous session.',
    })
    .click();
  await page.getByText('"name"').hover();
  await expect(
    page.getByText(
      'A single-line, Title Case, human-readable name for this wallet template (for use in user interfaces).',
    ),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByText('}').last().click();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Import Template' }).click();
  await expect(page.locator('h1 .title')).toHaveText('Untitled');
  await expect(page).toHaveScreenshot();
});
