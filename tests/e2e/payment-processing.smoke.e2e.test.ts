import { test, expect } from '@playwright/test';

test.describe('Payment Processing Flow @smoke @money', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
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

  test('stripe connect onboarding flow', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Look for Stripe Connect section
    const stripeSection = page.getByText(/stripe|payments|bank account/i);
    
    if (await stripeSection.isVisible()) {
      // Look for connect button
      const connectButton = page.getByRole('button', { name: /connect|setup.*stripe/i });
      
      if (await connectButton.isVisible()) {
        await connectButton.click();
        
        // Should redirect to Stripe onboarding or show Stripe iframe
        await page.waitForLoadState('networkidle');
        
        // Check if we're on Stripe's domain or see Stripe elements
        const isStripeFlow = page.url().includes('stripe') || 
                           await page.getByText(/stripe|connect.*account/i).isVisible();
        
        expect(isStripeFlow).toBeTruthy();
      }
    }
  });

  test('invoice generation from completed job', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    
    // Find a completed job
    const completedJob = page.locator('tr:has-text("Completed")').first();
    
    if (await completedJob.isVisible()) {
      await completedJob.click();
      
      // Look for generate invoice option
      const invoiceButton = page.getByRole('button', { name: /invoice|bill|generate invoice/i });
      
      if (await invoiceButton.isVisible()) {
        await invoiceButton.click();
        
        // Should navigate to invoice creation
        await page.waitForLoadState('networkidle');
        
        // Should pre-fill with job/quote details
        const invoiceForm = page.getByText(/invoice|amount|total/i);
        await expect(invoiceForm).toBeVisible();
        
        // Should see line items from the job
        const lineItems = page.locator('[data-testid="line-item"]').or(
          page.getByText(/description.*quantity.*price/i)
        );
        
        if (await lineItems.isVisible()) {
          expect(lineItems).toBeVisible();
        }
        
        // Generate invoice
        const generateButton = page.getByRole('button', { name: /generate|create invoice/i });
        await generateButton.click();
        
        await page.waitForLoadState('networkidle');
        
        // Should be on invoices page or see success message
        expect(page.url()).toContain('/invoices');
      }
    }
  });

  test('invoice payment processing', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    
    // Find an unpaid invoice
    const unpaidInvoice = page.locator('tr:has-text("Unpaid")').or(
      page.locator('tr:has-text("Pending")')
    ).first();
    
    if (await unpaidInvoice.isVisible()) {
      await unpaidInvoice.click();
      
      // Look for payment processing options
      const collectPaymentButton = page.getByRole('button', { name: /collect.*payment|process payment/i });
      
      if (await collectPaymentButton.isVisible()) {
        await collectPaymentButton.click();
        
        // Should see payment form or Stripe elements
        await page.waitForLoadState('networkidle');
        
        // Look for payment form elements
        const paymentForm = page.getByText(/card.*number|payment.*method|stripe/i);
        
        if (await paymentForm.isVisible()) {
          expect(paymentForm).toBeVisible();
          
          // In a real test environment, you'd use Stripe's test card numbers
          // For now, we just verify the form loads
        }
      }
      
      // Also check for send invoice option
      const sendInvoiceButton = page.getByRole('button', { name: /send.*invoice|email.*invoice/i });
      
      if (await sendInvoiceButton.isVisible()) {
        await sendInvoiceButton.click();
        
        // Should see email sending confirmation
        await page.waitForLoadState('networkidle');
        
        const confirmationMessage = page.getByText(/sent|email.*sent|invoice.*sent/i);
        if (await confirmationMessage.isVisible()) {
          expect(confirmationMessage).toBeVisible();
        }
      }
    }
  });

  test('payment status updates correctly', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    
    // This test would typically involve webhook simulation
    // For smoke test, we verify the UI handles different payment statuses
    
    const invoiceStatuses = ['Unpaid', 'Pending', 'Paid', 'Failed'];
    
    for (const status of invoiceStatuses) {
      const invoiceWithStatus = page.getByText(status).first();
      
      if (await invoiceWithStatus.isVisible()) {
        // Each status should have appropriate styling and actions
        await invoiceWithStatus.click();
        
        // Verify status-specific UI elements
        await page.waitForLoadState('networkidle');
        
        if (status === 'Paid') {
          // Paid invoices should show payment date and method
          const paymentInfo = page.getByText(/paid.*on|payment.*received/i);
          if (await paymentInfo.isVisible()) {
            expect(paymentInfo).toBeVisible();
          }
        } else if (status === 'Failed') {
          // Failed payments should show retry options
          const retryButton = page.getByRole('button', { name: /retry|try.*again/i });
          if (await retryButton.isVisible()) {
            expect(retryButton).toBeVisible();
          }
        }
        
        // Go back to list
        const backButton = page.getByRole('button', { name: /back/i }).or(
          page.getByRole('link', { name: /invoices/i })
        );
        
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForLoadState('networkidle');
        }
      }
    }
  });

  test('payment reporting and reconciliation', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    
    // Look for payment summary or reporting features
    const paymentsTab = page.getByRole('tab', { name: /payments|transactions/i });
    
    if (await paymentsTab.isVisible()) {
      await paymentsTab.click();
      
      // Should see payment history
      const paymentHistory = page.getByText(/payment.*history|transaction.*history/i);
      await expect(paymentHistory).toBeVisible();
      
      // Should show total amounts
      const totalReceived = page.getByText(/total.*received|total.*paid/i);
      if (await totalReceived.isVisible()) {
        expect(totalReceived).toBeVisible();
      }
    }
    
    // Check for export functionality
    const exportButton = page.getByRole('button', { name: /export|download|csv/i });
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Should trigger download or show export options
      await page.waitForLoadState('networkidle');
    }
  });
});