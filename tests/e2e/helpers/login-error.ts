import type { Page } from '@playwright/test';

/**
 * Login form surfaces failures in a small banner (see LoginForm).
 * Avoid `div:has-text("...")` — ancestor divs also match and trigger strict-mode violations.
 */
export function invalidLoginCredentialsLocator(page: Page) {
  return page.getByText('Invalid login credentials', { exact: true }).first();
}
