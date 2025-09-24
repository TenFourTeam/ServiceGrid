import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('clerk-session', 'mock-session-token');
    });
  });

  test('dashboard has no critical accessibility issues', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .exclude('.clerk-components') // Exclude third-party components
      .analyze();

    const criticalViolations = results.violations.filter(
      violation => ['critical', 'serious'].includes(violation.impact!)
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('customers page is accessible', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      violation => violation.impact === 'critical'
    );

    expect(criticalViolations).toHaveLength(0);
  });
});