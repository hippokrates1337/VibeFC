import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file at the project root
dotenv.config({ path: path.resolve(__dirname, '.env') });
// Also load .env.local for local development overrides
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Read environment variables from file. https://github.com/motdotla/dotenv
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e', // Directory containing the E2E tests
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run required local servers before starting the tests */
  webServer: [
    {
      // Backend API needed by e2e flows (claim-invites, forecasts, variables, etc.).
      // `nest start` (non-watch) can hit EBUSY unlinking `dist` on OneDrive; watch mode is more stable.
      command: 'npm run backend:dev',
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Clean `.next` first: on Windows + OneDrive, a stale/partial `.next` can make `next dev`
      // crash with EINVAL on readlink during hot-reloader cleanup (see Next issue trackers).
      command: 'npm run clean && npm run dev',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      // Cold `next dev` after `rimraf .next` can exceed 120s when Playwright's readiness probe
      // hits middleware + first-page compilation on a slow disk.
      timeout: 240_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
}); 