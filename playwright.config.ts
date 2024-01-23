import { defineConfig, devices } from '@playwright/test';

const docker = process.env.DOCKER !== undefined;
const production = process.env.NODE_ENV === 'production';
const host = docker ? 'http://host.docker.internal' : 'http://localhost';
const url = `${host}:${production ? '31313' : '3000'}`;
const ci = Boolean(process.env.CI) || docker;

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: ci ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: url,
    headless: true,
    launchOptions: {
      ignoreDefaultArgs: ['--hide-scrollbars'],
    },
    trace: ci ? 'retain-on-failure' : 'on-first-retry',
    video: ci ? 'retain-on-failure' : 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-hd',
      use: {
        ...devices['Desktop Chrome HiDPI'],
      },
      testMatch: /screenshots.spec.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      testIgnore: /screenshots.spec.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /screenshots.spec.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /screenshots.spec.ts/,
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPad Mini landscape'] },
      testIgnore: /screenshots.spec.ts/,
    },
  ],
  ...(docker
    ? {}
    : {
        webServer: {
          command: production ? 'yarn preview --open=0' : 'yarn start --open=0',
          reuseExistingServer: !process.env.CI,
          url,
        },
      }),
});
