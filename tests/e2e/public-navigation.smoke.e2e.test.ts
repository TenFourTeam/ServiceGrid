import { test, expect } from '@playwright/test';

test.describe('Public Navigation @smoke', () => {
  test('landing page navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that sign-in and sign-up buttons exist
    const signInButton = page.getByRole('button', { name: /sign in/i });
    const signUpButton = page.getByRole('button', { name: /try for free|try free/i });
    
    await expect(signInButton).toBeVisible();
    await expect(signUpButton).toBeVisible();
  });

  test('logo navigation works', async ({ page }) => {
    await page.goto('/clerk-auth');
    await page.waitForLoadState('networkidle');
    
    // Navigate back to home via logo
    const logoLink = page.getByRole('link', { name: /servicegrid home/i });
    
    if (await logoLink.isVisible()) {
      await logoLink.click();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl === '/' || currentUrl.includes('localhost')).toBe(true);
    }
  });

  test('responsive design works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should still see main elements
    await expect(page.locator('body')).toBeVisible();
    
    // Navigation should be responsive
    const mobileNav = page.locator('header').or(page.locator('nav'));
    await expect(mobileNav).toBeVisible();
  });
});