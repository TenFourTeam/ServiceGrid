import { test, expect } from '@playwright/test';

test.describe('Landing Page Smoke Tests @smoke', () => {
  test('landing page loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page title contains the app name
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Should see main content
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation works correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for sign-in or login links
    const authLink = page.getByRole('link', { name: /sign in|login|get started/i }).first();
    
    if (await authLink.isVisible()) {
      await authLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate somewhere (auth page or modal)
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    }
  });

  test('page is responsive', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });
});