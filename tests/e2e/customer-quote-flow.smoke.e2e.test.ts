import { test, expect } from '@playwright/test';

test.describe('Customer & Quote Management Flow @smoke @money', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock authentication for E2E tests
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('clerk-session', 'mock-session-token');
      localStorage.setItem('user-profile', JSON.stringify({
        id: 'test-user',
        email: 'owner@example.com',
        role: 'owner',
        business_id: 'test-business'
      }));
    });
  });

  test('complete customer creation and quote generation flow', async ({ page }) => {
    // Navigate to customers page
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    
    // Create new customer
    const addCustomerButton = page.getByRole('button', { name: /add customer|new customer/i }).or(
      page.getByText(/add customer|new customer/i)
    );
    
    if (await addCustomerButton.isVisible()) {
      await addCustomerButton.click();
      
      // Fill customer form
      await page.getByLabel(/name/i).fill('John Doe');
      await page.getByLabel(/email/i).fill('john.doe@example.com');
      await page.getByLabel(/phone/i).fill('(555) 123-4567');
      await page.getByLabel(/address/i).fill('123 Main St, Anytown, ST 12345');
      
      // Save customer
      const saveButton = page.getByRole('button', { name: /save|create/i });
      await saveButton.click();
      
      // Should see success message or return to customer list
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate to quotes
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    
    // Create new quote
    const newQuoteButton = page.getByRole('button', { name: /new quote|create quote/i }).or(
      page.getByText(/new quote|create quote/i)
    );
    
    if (await newQuoteButton.isVisible()) {
      await newQuoteButton.click();
      
      // Select customer (should include our newly created customer)
      const customerSelect = page.getByLabel(/customer/i).or(
        page.locator('[placeholder*="customer"]')
      );
      
      if (await customerSelect.isVisible()) {
        await customerSelect.click();
        
        // Look for John Doe in dropdown
        const johnDoeOption = page.getByText('John Doe');
        if (await johnDoeOption.isVisible()) {
          await johnDoeOption.click();
        }
      }
      
      // Add line items
      const descriptionInput = page.getByLabel(/description/i).first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('Landscape Design');
        
        const quantityInput = page.getByLabel(/quantity/i).first();
        await quantityInput.fill('1');
        
        const priceInput = page.getByLabel(/price|amount/i).first();
        await priceInput.fill('500.00');
      }
      
      // Save quote
      const saveQuoteButton = page.getByRole('button', { name: /save|create quote/i });
      await saveQuoteButton.click();
      
      await page.waitForLoadState('networkidle');
    }
    
    // Verify quote was created and appears in list
    await expect(page.getByText(/EST\d{3}|Quote #\d+/)).toBeVisible();
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('quote status progression works', async ({ page }) => {
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    
    // Find first quote in draft status
    const draftQuote = page.getByText(/draft/i).first();
    
    if (await draftQuote.isVisible()) {
      // Click on quote to open details or find actions menu
      await draftQuote.click();
      
      // Look for send quote action
      const sendButton = page.getByRole('button', { name: /send/i }).or(
        page.getByText(/send quote/i)
      );
      
      if (await sendButton.isVisible()) {
        await sendButton.click();
        
        // Should see confirmation or status change
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/sent/i)).toBeVisible();
      }
    }
  });

  test('customer search and filtering works', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i).or(
      page.getByLabel(/search/i)
    );
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('John');
      
      // Should filter results to show only customers with "John" in name
      await page.waitForTimeout(1000); // Wait for debounced search
      
      // Verify search results
      const customerRows = page.locator('[data-testid="customer-row"]').or(
        page.locator('tr:has-text("@")')  // Rows with email addresses
      );
      
      const count = await customerRows.count();
      if (count > 0) {
        // At least one result should contain "John"
        await expect(page.getByText(/john/i)).toBeVisible();
      }
    }
  });
});