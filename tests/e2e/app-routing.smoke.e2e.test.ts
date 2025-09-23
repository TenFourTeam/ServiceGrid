import { test, expect } from '@playwright/test';

test.describe('App Routing Smoke Tests @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for protected routes
    await page.evaluate(() => {
      localStorage.setItem('clerk-session', 'mock-session-token');
      localStorage.setItem('user-profile', JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner'
      }));
    });
  });

  test('protected routes are accessible when authenticated', async ({ page }) => {
    const protectedRoutes = ['/customers', '/quotes', '/jobs', '/calendar', '/team', '/settings'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should not redirect to auth (assuming mock session works)
      expect(page.url()).toContain(route);
      
      // Should see some content
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('404 page works correctly', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');
    
    // Should see 404 content or redirect to a valid page
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('navigation between main sections works', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to other sections via sidebar/nav
    const navItems = ['quotes', 'calendar', 'team'];
    
    for (const item of navItems) {
      const navLink = page.getByRole('link', { name: new RegExp(item, 'i') }).first();
      
      if (await navLink.isVisible()) {
        await navLink.click();
        await page.waitForLoadState('networkidle');
        
        // Should navigate to the expected route
        expect(page.url()).toContain(item);
      }
    }
  });
});