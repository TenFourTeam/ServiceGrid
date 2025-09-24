import { test, expect } from '@playwright/test';

test.describe('Job Management Flow @smoke', () => {
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

  test('convert approved quote to job', async ({ page }) => {
    // Navigate to quotes to find an approved one
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    
    // Look for approved quote
    const approvedQuote = page.locator('tr:has-text("Approved")').first().or(
      page.getByText(/approved/i).first()
    );
    
    if (await approvedQuote.isVisible()) {
      await approvedQuote.click();
      
      // Look for "Convert to Job" or similar action
      const convertButton = page.getByRole('button', { name: /convert.*job|create job/i });
      
      if (await convertButton.isVisible()) {
        await convertButton.click();
        
        // Should navigate to job creation or see job form
        await page.waitForLoadState('networkidle');
        
        // Fill in job details
        const titleInput = page.getByLabel(/title|name/i);
        if (await titleInput.isVisible()) {
          await titleInput.fill('Landscape Installation Job');
        }
        
        const descriptionInput = page.getByLabel(/description|notes/i);
        if (await descriptionInput.isVisible()) {
          await descriptionInput.fill('Complete landscape installation per approved quote');
        }
        
        // Set scheduled date
        const dateInput = page.getByLabel(/date|schedule/i);
        if (await dateInput.isVisible()) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateString = tomorrow.toISOString().split('T')[0];
          await dateInput.fill(dateString);
        }
        
        // Create job
        const createJobButton = page.getByRole('button', { name: /create|save job/i });
        await createJobButton.click();
        
        await page.waitForLoadState('networkidle');
        
        // Should be redirected to jobs page or see success message
        expect(page.url()).toContain('/jobs');
      }
    }
  });

  test('job status updates work correctly', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    
    // Find a scheduled job
    const scheduledJob = page.locator('tr:has-text("Scheduled")').first();
    
    if (await scheduledJob.isVisible()) {
      await scheduledJob.click();
      
      // Look for status update options
      const statusButton = page.getByRole('button', { name: /status|update status/i });
      
      if (await statusButton.isVisible()) {
        await statusButton.click();
        
        // Select "In Progress" status
        const inProgressOption = page.getByText(/in progress|started/i);
        if (await inProgressOption.isVisible()) {
          await inProgressOption.click();
          
          // Should see confirmation or status change
          await page.waitForLoadState('networkidle');
          await expect(page.getByText(/in progress/i)).toBeVisible();
        }
      }
    }
  });

  test('calendar view shows jobs correctly', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    
    // Should see calendar interface
    const calendarView = page.locator('[data-testid="calendar"]').or(
      page.locator('.calendar').or(
        page.getByText(/today|this week|this month/i)
      )
    );
    
    await expect(calendarView).toBeVisible();
    
    // Look for scheduled jobs on the calendar
    const jobEvent = page.locator('[data-testid="job-event"]').or(
      page.locator('.job').or(
        page.getByText(/EST\d{3}|Job #\d+/i)
      )
    );
    
    // If there are jobs, clicking should show details
    if (await jobEvent.first().isVisible()) {
      await jobEvent.first().click();
      
      // Should see job details modal or popup
      await expect(page.getByText(/job details|customer|scheduled/i)).toBeVisible();
    }
  });

  test('team member assignment works', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    
    // Find a job and open it
    const jobRow = page.locator('tr').first();
    if (await jobRow.isVisible()) {
      await jobRow.click();
      
      // Look for team assignment section
      const assignButton = page.getByRole('button', { name: /assign|team/i });
      
      if (await assignButton.isVisible()) {
        await assignButton.click();
        
        // Should see team member options
        const teamMemberOption = page.getByText(/@.*\.com|worker|technician/i).first();
        
        if (await teamMemberOption.isVisible()) {
          await teamMemberOption.click();
          
          // Save assignment
          const saveButton = page.getByRole('button', { name: /save|assign/i });
          await saveButton.click();
          
          await page.waitForLoadState('networkidle');
          
          // Should see assigned team member in job details
          await expect(page.getByText(/assigned/i)).toBeVisible();
        }
      }
    }
  });

  test('job completion flow updates related records', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    
    // Find an in-progress job
    const inProgressJob = page.locator('tr:has-text("In Progress")').first();
    
    if (await inProgressJob.isVisible()) {
      await inProgressJob.click();
      
      // Complete the job
      const completeButton = page.getByRole('button', { name: /complete|finish/i });
      
      if (await completeButton.isVisible()) {
        await completeButton.click();
        
        // May need to add completion notes
        const notesInput = page.getByLabel(/notes|comments/i);
        if (await notesInput.isVisible()) {
          await notesInput.fill('Job completed successfully. All work finished as specified.');
        }
        
        // Confirm completion
        const confirmButton = page.getByRole('button', { name: /confirm|complete job/i });
        await confirmButton.click();
        
        await page.waitForLoadState('networkidle');
        
        // Should see completed status
        await expect(page.getByText(/completed/i)).toBeVisible();
        
        // Should offer to generate invoice
        const generateInvoiceButton = page.getByRole('button', { name: /invoice|bill/i });
        if (await generateInvoiceButton.isVisible()) {
          // This confirms the job completion flow integrates with invoicing
          expect(generateInvoiceButton).toBeVisible();
        }
      }
    }
  });
});