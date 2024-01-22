import { readFileSync } from 'node:fs';

import { expect, test } from './test-utils';

test('opens the guide at /guide and /guide/', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Bitauth Templates' }),
  ).toBeHidden();
  await page.goto('/guide');
  await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Bitauth Templates' }),
  ).toBeVisible();
  await page.goto('/guide/');
  await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Bitauth Templates' }),
  ).toBeVisible();
});

test('warns on invalid share links', async ({ page }) => {
  /* window.utils.stringToUriPayload('broken'); */
  const broken = 'eJxLKsrPTs0DAAjBAoI=';
  page.on('dialog', (dialog) => {
    expect(dialog.message()).toEqual(
      'This sharing URL seems to be corrupted. Please check the link and try again.',
    );
    void dialog.accept();
  });
  await page.goto(`/import-template/${broken}`);
  await expect(
    page.getByRole('heading', { name: 'Choose a template to begin' }),
  ).toBeVisible();
});

test('successfully imports fixtures/single_signature_p2pkh.share-link.json', async ({
  page,
}) => {
  const { payload } = JSON.parse(
    readFileSync(`tests/fixtures/single_signature_p2pkh.share-link.json`, {
      encoding: 'utf8',
    }),
  ) as { payload: string };
  let logs = '';
  page.on('console', (msg) => {
    logs += msg.text();
  });
  await page.goto(`/import-template/${payload}`);
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
  expect(logs).toContain(`payload: ${payload}`);
  expect(logs).toContain('Single Signature (P2PKH)');
});

test('successfully imports from GitHub Gist', async ({ page }) => {
  const gistId = 'a055ad6ba863a4472767bb5e441a3437';
  await page.routeFromHAR('tests/fixtures/network/success/gist.har', {
    url: /github.com/,
    updateMode: 'minimal',
    update: Boolean(process.env.UPDATE_HAR),
  });
  await page.goto(`/import-gist/${gistId}`);
  await expect(page.locator('h1 .title')).toHaveText(
    'Single Signature (P2PKH)',
  );
});

test('displays error if no matching GitHub Gist', async ({ page }) => {
  const gistId = '_404';
  await page.routeFromHAR('tests/fixtures/network/404/gist.har', {
    url: /github.com/,
    updateMode: 'minimal',
    update: Boolean(process.env.UPDATE_HAR),
  });
  page.on('dialog', (dialog) => {
    expect(dialog.message()).toContain(
      'Could not find Gist. Please check the URL and try again.',
    );
    void dialog.accept();
  });
  await page.goto(`/import-gist/${gistId}`);
  await expect(
    page.getByRole('heading', { name: 'Choose a template to begin' }),
  ).toBeVisible();
});

test('displays error if GitHub Gist has no JSON file', async ({ page }) => {
  const gistId = 'mock';
  await page.route(/github.com/, async (route) => {
    const json = { files: { '0_readme.md': { content: 'something else' } } };
    await route.fulfill({ json });
  });
  page.on('dialog', (dialog) => {
    expect(dialog.message()).toContain("No file ending in '.json' found");
    void dialog.accept();
  });
  await page.goto(`/import-gist/${gistId}`);
  await expect(
    page.getByRole('heading', { name: 'Choose a template to begin' }),
  ).toBeVisible();
});

test("displays error if GitHub's API response changes", async ({ page }) => {
  const gistId = 'mock';
  await page.route(/github.com/, async (route) => {
    const json = { files: { 't.json': { content: { unexpected: 'type' } } } };
    await route.fulfill({ json });
  });
  page.on('dialog', (dialog) => {
    expect(dialog.message()).toContain(
      'Unexpected response from GitHub, returned file (t.json) object: {"content":{"unexpected":"type"}}',
    );
    void dialog.accept();
  });
  await page.goto(`/import-gist/${gistId}`);
  await expect(
    page.getByRole('heading', { name: 'Choose a template to begin' }),
  ).toBeVisible();
});

test('allows user to manually correct invalid templates imported from Github Gists', async ({
  page,
}) => {
  const gistId = 'mock';
  await page.route(/github.com/, async (route) => {
    const json = {
      files: { 't.json': { content: '{"valid JSON":"invalid template"}' } },
    };
    await route.fulfill({ json });
  });
  page.on('dialog', (dialog) => {
    expect(dialog.message()).toContain(
      'There is a problem with the imported GitHub Gist: this wallet template has validation errors. It may have been created manually or with an outdated version of Bitauth IDE.',
    );
    void dialog.accept();
  });
  await page.goto(`/import-gist/${gistId}`);
  await expect(
    page.getByRole('heading', { name: 'Import/Export Wallet Template' }),
  ).toBeVisible();
  await expect(
    page.getByText('{"valid JSON":"invalid template"}'),
  ).toBeVisible();
});

test("displays errors when fetching from GitHub's API", async ({ page }) => {
  const gistId = 'mock';
  await page.route(/github.com/, async (route) => {
    await route.abort('internetdisconnected');
  });
  page.on('dialog', (dialog) => {
    expect(dialog.message()).toContain(
      'Could not reach GitHub to download the requested Gist (https://api.github.com/gists/mock). Please try again when connectivity is restored.',
    );
    void dialog.accept();
  });
  await page.goto(`/import-gist/${gistId}`);
  await expect(
    page.getByRole('heading', { name: 'Choose a template to begin' }),
  ).toBeVisible();
});

test('gracefully handles outdated share links', async ({ page }) => {
  /* window.utils.stringToUriPayload('{ "valid JSON": "invalid template" }'); */
  const validJsonPayload =
    'eJyrVlAqS8zJTFHwCvb3U7JSUMrMg_BLUnMLchJLUpUUagHVAAvo';
  page.on('dialog', (dialog) => {
    expect(dialog.message()).toContain(
      'This link may have been created manually or with an outdated version of Bitauth IDE: the link is valid, but the wallet template it encodes is not.',
    );
    void dialog.accept();
  });
  await page.goto(`/import-template/${validJsonPayload}`);
  await expect(
    page.getByRole('heading', { name: 'Import/Export Wallet Template' }),
  ).toBeVisible();
  await expect(
    page.getByText('{ "valid JSON": "invalid template" }'),
  ).toBeVisible();
});

test('ignores unknown routes and clears the URL', async ({ page }) => {
  const unknownRoute = 'e2e-test';
  await page.goto(`/${unknownRoute}`);
  await expect(
    page.getByRole('heading', { name: 'Choose a template to begin' }),
  ).toBeVisible();
  expect(page.url()).not.toContain(unknownRoute);
});
