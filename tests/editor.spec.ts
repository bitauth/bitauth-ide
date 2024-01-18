import { expect, loadTemplate, scrollUntil, test } from './test-utils';

test('renders spacers as expected', async ({ page }) => {
  await loadTemplate(page, 'tests/fixtures/spacers.json');
  await page.getByRole('button', { name: 'True' }).click();
  await expect(page.getByRole('heading', { name: 'True P2SH' })).toBeVisible();
  await page.waitForFunction(
    `window._IDE_E2E_TESTING_VIEW_CONFIG !== undefined`,
  );
  await page.evaluate(
    `window._IDE_E2E_TESTING_VIEW_CONFIG.setFrames2SplitHeight(10)`,
  );
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'False' }).click();
  await expect(page).toHaveScreenshot();
});

test('renders error as expected for a non-push opcode in unlocking script', async ({
  page,
}) => {
  await loadTemplate(page, 'tests/fixtures/non-push-unlocking-opcode.json');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Unlock', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Unlocking bytecode may contain only push operations.'),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
});

test('Displays evaluation of tested scripts', async ({ page }) => {
  await loadTemplate(page, 'tests/fixtures/state-merkle-trees.json');
  await page.getByRole('button', { name: 'Empty Leaf', exact: true }).click();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Filled Leaf', exact: true }).click();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Left Sibling', exact: true }).click();
  await expect(page).toHaveScreenshot();
  await page
    .getByRole('button', { name: 'Right Sibling', exact: true })
    .click();
  await expect(page).toHaveScreenshot();
  await page
    .getByRole('button', { name: 'New Merkle Root', exact: true })
    .click();
  await expect(page).toHaveScreenshot();
  await page
    .getByRole('button', { name: 'Replace Empty Leaf', exact: true })
    .click();
  await expect(page.locator('.state.highlight.success')).toContainText('1');
});

test('Displays evaluation of tested scripts with custom scenarios', async ({
  page,
}) => {
  await loadTemplate(
    page,
    'libauth/src/lib/transaction/fixtures/templates/cash-channels-v1.json',
  );
  await page.getByRole('button', { name: 'Is 2 Bytes' }).click();
});

test.fixme(
  'scrolls, renders success highlighting on valid unlock',
  async ({ page, isMobile }) => {
    test.skip(isMobile, '`scrollUntil` is not supported by mobile WebKit');
    await loadTemplate(page, 'tests/fixtures/state-merkle-trees.json');
    await page.getByRole('button', { name: 'Replace Empty Leaf' }).click();

    await scrollUntil(
      page,
      page.locator('.ScriptEditor-locking .editor'),
      page.getByText('OP_OUTPUTVALUE OP_EQUAL'),
    );
    await page.locator('.state.highlight.success').isVisible();
    await expect(page).toHaveScreenshot();
  },
);

test.fixme(
  'ignores misleading unicode characters, shows compilation on hover',
  async ({ page }) => {
    await loadTemplate(page, 'tests/fixtures/empty.json');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.locator('.ScriptEditor-locking .monaco-editor').click();
    await page
      .locator('.editor textarea')
      .last()
      .fill("<'ﬁt'> <'fit'>\nOP_EQUAL\n");
    await page.getByText('<').first().hover();
    await expect(page).toHaveScreenshot();
  },
);
