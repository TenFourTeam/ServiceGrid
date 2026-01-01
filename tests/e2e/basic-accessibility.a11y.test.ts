import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Basic Accessibility Tests', () => {
  test('landing page has no critical accessibility issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .analyze();

    const criticalViolations = results.violations.filter(
      violation => violation.impact === 'critical'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('auth page is accessible', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .analyze();

    const criticalViolations = results.violations.filter(
      violation => violation.impact === 'critical'
    );

    expect(criticalViolations).toHaveLength(0);
  });
});
