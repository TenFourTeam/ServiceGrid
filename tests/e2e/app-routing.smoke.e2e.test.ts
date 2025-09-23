import { test, expect } from '@playwright/test';

test.describe('App Routing Smoke Tests @smoke', () => {
  test('protected routes redirect to auth when unauthenticated', async ({ page }) => {
    const protectedRoutes = ['/customers', '/quotes', '/calendar', '/team', '/settings'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should redirect to clerk auth page
      expect(page.url()).toContain('/clerk-auth');
    }
  });

  test('404 page works correctly', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');
    
    // Should see 404 content
    await expect(page.locator('body')).toBeVisible();
    // The NotFound page should have some indication it's a 404
    const hasNotFoundContent = await page.getByText(/not found|404|page not found/i).first().isVisible().catch(() => false);
    expect(hasNotFoundContent || page.url().includes('/clerk-auth')).toBeTruthy();
  });

  test('public routes are accessible', async ({ page }) => {
    const publicRoutes = ['/', '/clerk-auth'];
    
    for (const route of publicRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should load successfully
      await expect(page.locator('body')).toBeVisible();
    }
  });
});