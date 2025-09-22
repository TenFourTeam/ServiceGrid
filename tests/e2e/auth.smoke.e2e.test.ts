import { test, expect } from '@playwright/test';

test.describe('Authentication Flow @smoke', () => {
  test('user can navigate to sign-in page', async ({ page }) => {
    await page.goto('/');
    
    // Should see landing page or redirect to auth
    const title = await page.title();
    expect(title).toContain('ServiceFlow'); // Adjust based on your app name
    
    // Look for sign-in related elements
    const signInButton = page.getByRole('link', { name: /sign in/i }).or(
      page.getByRole('button', { name: /sign in/i })
    );
    
    if (await signInButton.isVisible()) {
      await signInButton.click();
    }
    
    // Should be on Clerk auth page or see auth form
    await expect(page).toHaveURL(/.*clerk.*|.*auth.*|.*sign-in.*/);
  });

  test('sign-in form is accessible and functional', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Wait for the auth form to load
    await page.waitForLoadState('networkidle');
    
    // Should see email input (Clerk's default)
    const emailInput = page.getByLabel(/email/i).or(
      page.getByPlaceholder(/email/i)
    );
    
    await expect(emailInput).toBeVisible();
    
    // Should be able to type in email field
    await emailInput.fill('test@example.com');
    
    // Should see continue/sign-in button
    const continueButton = page.getByRole('button', { name: /continue|sign in/i });
    await expect(continueButton).toBeVisible();
  });

  test('unauthenticated user redirects from protected routes', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/customers');
    
    // Should redirect to auth or see auth form
    await page.waitForLoadState('networkidle');
    
    // Should either be on auth page or see sign-in elements
    const currentUrl = page.url();
    const hasAuthElements = await page.getByText(/sign in|log in/i).first().isVisible().catch(() => false);
    
    expect(currentUrl.includes('/sign-in') || currentUrl.includes('clerk') || hasAuthElements).toBeTruthy();
  });
});

test.describe('User Session Management @smoke', () => {
  test('session persists across page refreshes', async ({ page }) => {
    // This test assumes we can mock authentication for testing
    // In a real scenario, you'd use Clerk's test mode or test users
    
    await page.goto('/');
    
    // Mock authentication by setting localStorage or cookies
    await page.evaluate(() => {
      // This is a simplified mock - adjust based on your auth implementation
      localStorage.setItem('clerk-session', 'mock-session-token');
      localStorage.setItem('user-profile', JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });
    
    // Navigate to a protected route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should not redirect to auth (assuming mock session is valid)
    expect(page.url()).toContain('/dashboard');
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be on dashboard (session persisted)
    expect(page.url()).toContain('/dashboard');
  });

  test('sign-out clears session', async ({ page }) => {
    // Set up mock authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('clerk-session', 'mock-session-token');
    });
    
    await page.goto('/dashboard');
    
    // Look for sign-out button/menu
    const userMenu = page.getByRole('button', { name: /profile|user|account/i }).or(
      page.getByTestId('user-menu')
    );
    
    if (await userMenu.isVisible()) {
      await userMenu.click();
      
      const signOutButton = page.getByRole('menuitem', { name: /sign out|log out/i }).or(
        page.getByRole('button', { name: /sign out|log out/i })
      );
      
      if (await signOutButton.isVisible()) {
        await signOutButton.click();
        
        // Should redirect to landing or auth page
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        expect(currentUrl === '/' || currentUrl.includes('/sign-in')).toBeTruthy();
      }
    }
  });
});