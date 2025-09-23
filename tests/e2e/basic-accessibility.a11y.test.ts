import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Basic Accessibility Tests', () => {
  test('landing page has no critical accessibility issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .exclude('.clerk-components') // Exclude third-party components
      .analyze();

    const criticalViolations = results.violations.filter(
      violation => violation.impact === 'critical'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('main app sections are accessible when authenticated', async ({ page }) => {
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('clerk-session', 'mock-session-token');
      localStorage.setItem('user-profile', JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        role: 'owner'
      }));
    });

    const routes = ['/customers', '/quotes', '/calendar'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .exclude('.clerk-components')
        .analyze();

      const criticalViolations = results.violations.filter(
        violation => violation.impact === 'critical'
      );

      expect(criticalViolations).toHaveLength(0);
    }
  });
});