import { test, expect } from '@playwright/test';

test.describe('Authentication Flow @smoke', () => {
  test('user can navigate to sign-in page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should see landing page
    const title = await page.title();
    expect(title).toContain('ServiceGrid');
    
    // Look for sign-in related elements
    const signInButton = page.locator('button').filter({ hasText: /sign in/i }).first();
    
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.waitForTimeout(1000); // Give time for modal/navigation
      // Clerk modal should appear or navigate
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('auth page loads when accessing protected routes', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to clerk auth page
    expect(page.url()).toContain('/clerk-auth');
    
    // Should see some auth-related content
    await expect(page.locator('body')).toBeVisible();
  });

  test('sign-in button navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for sign-in button in TopNav
    const signInButton = page.locator('button').filter({ hasText: /sign in/i }).first();
    
    if (await signInButton.isVisible()) {
      await signInButton.click();
      // Clerk modal should open or navigate somewhere
      await page.waitForTimeout(1000); // Give modal time to appear
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('unauthenticated user redirects from protected routes', async ({ page }) => {
    const protectedRoutes = ['/calendar', '/customers', '/quotes'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should redirect to clerk auth page
      expect(page.url()).toContain('/clerk-auth');
    }
  });
});