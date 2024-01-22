import { expect, loadTemplate, test } from './test-utils';

test('renders entity settings', async ({ page }) => {
  await loadTemplate(
    page,
    'tests/fixtures/single_signature_p2pkh.wallet-template.json',
  );
  await page.getByRole('button', { name: 'Owner' }).click();
  await expect(
    page.getByRole('heading', { name: 'Entity Settings' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Owner' })).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByRole('heading', { name: 'Key key' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit Variable' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'guide', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
  await page.getByRole('heading', { name: 'Welcome!' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeHidden();
  await page.getByLabel('Close').click();
  await expect(
    page.getByRole('heading', { name: 'Edit Variable' }),
  ).toBeHidden();
});

test('allows single entity deletion and recreation', async ({ page }) => {
  await loadTemplate(
    page,
    'tests/fixtures/single_signature_p2pkh.wallet-template.json',
  );
  await page.getByRole('button', { name: 'Owner' }).click();
  await expect(
    page.getByRole('heading', { name: 'Entity Settings' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Owner' })).toBeVisible();
  await page.locator('.EntitySettingsEditor .delete-item-button').click();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(
    page.getByRole('heading', { name: 'Entity Settings' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Owner' })).toBeVisible();
  await page.locator('.EntitySettingsEditor .delete-item-button').click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete Entity' })
    .click();
  await page.getByText('IDE', { exact: true }).hover();
  await expect(page).toHaveScreenshot();
  await page
    .getByRole('heading', { name: 'Entities' })
    .getByRole('button')
    .click();
  await expect(
    page.getByRole('heading', { name: 'Add Entity to Wallet Template' }),
  ).toBeVisible();
  await page.getByLabel('Close').click();
  await expect(
    page.getByRole('heading', { name: 'Add Entity to Wallet Template' }),
  ).toBeHidden();
  await page
    .getByRole('heading', { name: 'Entities' })
    .getByRole('button')
    .click();
  await page.getByLabel('Entity Name').click();
  await page.getByLabel('Entity Name').fill('E2E Entity');
  await expect(page).toHaveScreenshot();
  await page.getByLabel('Entity ID').click();
  await page.getByLabel('Entity ID').fill('e2e_entity_id');
  await page.getByRole('button', { name: 'Add Entity' }).click();
  await expect(
    page.getByRole('heading', { name: 'Entity Settings' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E Entity' })).toBeVisible();
  await expect(page.getByLabel('Entity ID')).toHaveValue('e2e_entity_id');
});

test('warns about duplicate entity IDs', async ({ page }) => {
  await loadTemplate(
    page,
    'tests/fixtures/single_signature_p2pkh.wallet-template.json',
  );
  await page
    .getByRole('heading', { name: 'Entities' })
    .getByRole('button')
    .click();
  await page.getByLabel('Entity Name').click();
  await page.getByLabel('Entity Name').fill('Owner');
  await page.getByRole('button', { name: 'Add Entity' }).click();
  await expect(page.getByText('The ID owner is already in use.')).toBeVisible();
  await expect(page).toHaveScreenshot();
});

test('can switch between entities', async ({ page }) => {
  await page
    .getByRole('button', {
      name: '2-of-3 Multi-Signature → Transactions require any two of three co-owners to sign.',
    })
    .click();
  await expect(page.locator('h1 .title')).toHaveText('2-of-3 Multisig');
  await page.getByRole('button', { name: 'Signer 1', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Entity Settings' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Signer 1' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'key1 key1' })).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Signer 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Signer 2' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'key2 key2' })).toBeVisible();
  await page.getByRole('button', { name: 'Signer 3', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Signer 3' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'key3 key3' })).toBeVisible();
  await page.getByRole('button', { name: 'Signer 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Signer 2' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'key2 key2' })).toBeVisible();
  await page.getByRole('button', { name: 'Signer 1', exact: true }).click();
  await page.getByRole('heading', { name: 'Signer 1' }).locator('span').click();
  await page.getByPlaceholder('Entity Name').fill('Signer A');
  await page.getByText('A brief description of this entity...').click();
  await page
    .getByPlaceholder('A brief description of this entity...')
    .fill('Test description');
  await page.getByRole('button', { name: 'Signer 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Signer A' })).toBeHidden();
  await expect(page.getByText('Test description')).toBeHidden();
});

test('can modify all entity settings', async ({ page }) => {
  await page
    .getByRole('button', {
      name: '2-of-3 Multi-Signature → Transactions require any two of three co-owners to sign.',
    })
    .click();
  await page.getByRole('button', { name: 'Signer 1', exact: true }).click();
  await page.getByLabel('Entity ID').click();
  await page.getByLabel('Entity ID').fill('signer_a');
  expect(
    await page
      .locator('label')
      .filter({ hasText: 'Cosigner 2 & 3' })
      .isChecked(),
  ).toBeFalsy();
  await page.locator('label').filter({ hasText: 'Cosigner 1 & 2' }).click();
  expect(
    await page
      .locator('label')
      .filter({ hasText: 'Cosigner 1 & 2' })
      .isChecked(),
  ).toBeFalsy();
  await page.getByText('Signer 1 uses all template scripts.').click();
  await page.getByRole('button', { name: 'Signer 2', exact: true }).click();
  await page.getByRole('button', { name: 'Signer 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Signer 1' })).toBeVisible();
  await expect(page.getByLabel('Entity ID')).toHaveValue('signer_a');
  await page.getByText('Individually select scripts for Signer 1.').click();
  expect(
    await page
      .locator('label')
      .filter({ hasText: 'Cosigner 1 & 2' })
      .isChecked(),
  ).toBeFalsy();
});

test('can create variables', async ({ page }) => {
  await loadTemplate(
    page,
    'tests/fixtures/single_signature_p2pkh.wallet-template.json',
  );
  await page.getByRole('button', { name: 'Owner' }).click();
  await page.getByText('Add Variable...').click();
  await expect(
    page.getByRole('heading', { name: 'Create Variable' }),
  ).toBeVisible();
  await expect(page.getByLabel('Variable Type')).toHaveValue('AddressData');
  await expect(page).toHaveScreenshot();
  await expect(
    page.getByRole('heading', { name: 'Variable Name' }),
  ).toBeVisible();
  await page.getByLabel('Variable Type').selectOption('HdKey');
  await expect(
    page.getByRole('heading', { name: "Owner's HD Key" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByLabel('Variable Type').selectOption('WalletData');
  await expect(
    page.getByRole('heading', { name: 'Variable Name' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByLabel('Variable Type').selectOption('Key');
  await expect(
    page.getByRole('heading', { name: "Owner's Key" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByLabel('Variable Type').selectOption('AddressData');
  await page.getByText('Variable Name').click();
  await page.getByPlaceholder('Variable Name').fill('Test Variable');
  await page.getByText('A brief description of this variable...').click();
  await page
    .getByPlaceholder('A brief description of this variable...')
    .fill('Test description');
  await page.getByRole('button', { name: 'Create Variable' }).click();
  await expect(
    page
      .locator('.EntityVariableEditor')
      .getByRole('heading', { name: 'Test Variable' }),
  ).toBeVisible();
  await expect(
    page.locator('.EntityVariableEditor').getByText('test_variable'),
  ).toBeVisible();
  await expect(
    page.locator('.EntityVariableEditor').getByText('Test description'),
  ).toBeVisible();
});

test('conventionalizes IDs, warns about non-unique IDs', async ({ page }) => {
  await loadTemplate(
    page,
    'tests/fixtures/single_signature_p2pkh.wallet-template.json',
  );
  await page.getByRole('button', { name: 'Owner' }).click();
  await page.getByText('Add Variable...').click();
  await page.getByLabel('Variable ID').click();
  await page.getByLabel('Variable ID').fill('This is a test');
  await page.getByRole('heading', { name: 'Variable Name' }).click();
  await expect(page.getByLabel('Variable ID')).toHaveValue('this_is_a_test');
  await page.getByRole('heading', { name: 'Variable Name' }).click();
  await page.getByText('Variable Name').click();
  await page.getByPlaceholder('Variable Name').fill('Another Test');
  await expect(page.getByLabel('Variable ID')).toHaveValue('another_test');
  await page.getByLabel('Variable ID').click();
  await page.getByLabel('Variable ID').fill('key');
  await page.getByRole('button', { name: 'Create Variable' }).click();
  await expect(page.getByText('The ID key is already in use.')).toBeVisible();
  await expect(page).toHaveScreenshot();
  await page.getByLabel('Variable ID').click();
  await page.getByLabel('Variable ID').fill('key2');
  await page.getByRole('button', { name: 'Create Variable' }).click();
  await expect(
    page
      .locator('.EntityVariableEditor')
      .getByRole('heading', { name: 'Another Test' }),
  ).toBeVisible();
  await page
    .locator('.EntityVariableEditor')
    .getByRole('heading', { name: 'Another Test' })
    .click();
  await page.getByLabel('Variable ID').click();
  await page.getByLabel('Variable ID').fill('signing_serialization');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('_signing_serialization')).toBeVisible();
});

test('edit variable dialog allows deletion', async ({ page }) => {
  await loadTemplate(
    page,
    'tests/fixtures/single_signature_p2pkh.wallet-template.json',
  );
  await page.getByRole('button', { name: 'Owner' }).click();
  await page.getByRole('heading', { name: 'Key' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit Variable' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete Variable' }).click();
  await expect(page).toHaveScreenshot();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edit Variable' }),
  ).toBeVisible();
  await page
    .locator('.EditVariableDialog')
    .getByRole('button', { name: 'Delete Variable' })
    .click();
  await page.getByRole('button', { name: 'Delete Variable' }).nth(1).click();
  await expect(page.getByRole('heading', { name: 'Key' })).toBeHidden();
});
