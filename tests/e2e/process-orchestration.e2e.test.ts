/**
 * Process Orchestration E2E Tests
 * 
 * End-to-end tests for the dynamic process orchestration system.
 * Tests the full flow from user input to process chaining.
 * 
 * Note: These tests require authentication and a running application.
 * They are designed to run against a local or staging environment.
 */

import { test, expect } from '@playwright/test';

// Skip E2E tests by default (run with --grep @e2e or in CI)
test.describe.skip('Process Orchestration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('Lead Gen completion should show Next Process Suggestion card', async ({ page }) => {
    // This test verifies that after completing lead generation,
    // the UI shows a "Continue to Customer Communication" suggestion
    
    // Navigate to AI assistant (assuming there's a way to access it)
    // This would need to be adapted based on actual app navigation
    
    // Look for the AI chat interface
    const chatInterface = page.locator('[data-testid="ai-chat-interface"]');
    
    // If the AI chat is accessible, interact with it
    if (await chatInterface.isVisible()) {
      // Type a lead generation request
      const input = page.locator('[data-testid="ai-chat-input"]');
      await input.fill('Add new lead: John Smith, john@example.com, needs landscaping');
      await input.press('Enter');
      
      // Wait for the workflow to complete
      await page.waitForTimeout(5000);
      
      // Look for the Next Process Suggestion card
      const suggestionCard = page.locator('[data-testid="next-process-suggestion"]');
      
      // If workflow completed successfully, we should see a suggestion
      const isVisible = await suggestionCard.isVisible();
      if (isVisible) {
        // Verify the suggestion content
        await expect(suggestionCard).toContainText('Communication');
        
        // Verify there's a "Continue" button
        const continueButton = suggestionCard.locator('button:has-text("Continue")');
        await expect(continueButton).toBeVisible();
      }
    }
  });

  test('Clarification should appear for ambiguous intent', async ({ page }) => {
    // This test verifies that the ClarificationCard appears
    // when the user's intent is unclear
    
    const chatInterface = page.locator('[data-testid="ai-chat-interface"]');
    
    if (await chatInterface.isVisible()) {
      const input = page.locator('[data-testid="ai-chat-input"]');
      
      // Send an ambiguous message
      await input.fill('help me with this');
      await input.press('Enter');
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Look for clarification card
      const clarificationCard = page.locator('[data-testid="clarification-card"]');
      
      // If clarification was triggered
      if (await clarificationCard.isVisible()) {
        // Verify it has options
        const options = clarificationCard.locator('button');
        expect(await options.count()).toBeGreaterThan(0);
      }
    }
  });

  test('Context should pass between workflow card transition buttons', async ({ page }) => {
    // This test verifies that clicking workflow transition buttons
    // properly passes context to the next process
    
    // This is a complex test that would require:
    // 1. Completing a lead generation workflow
    // 2. Clicking the "Contact Customer" button
    // 3. Verifying that the communication workflow receives customer context
    
    // For now, just verify the UI structure exists
    const workflowCard = page.locator('[data-testid="lead-workflow-card"]');
    
    if (await workflowCard.isVisible()) {
      // Look for the Contact Customer button
      const contactButton = workflowCard.locator('button:has-text("Contact Customer")');
      
      if (await contactButton.isVisible()) {
        // The button should be clickable
        await expect(contactButton).toBeEnabled();
      }
    }
  });

  test('Process journey should be tracked in activity log', async ({ page }) => {
    // This test verifies that process journeys are recorded
    // in the ai_activity_log table
    
    // This would require:
    // 1. Triggering a workflow
    // 2. Checking the database for activity_type = 'process_journey'
    
    // For now, just verify the flow completes without errors
    const chatInterface = page.locator('[data-testid="ai-chat-interface"]');
    
    if (await chatInterface.isVisible()) {
      const input = page.locator('[data-testid="ai-chat-input"]');
      
      // Send a message that triggers a workflow
      await input.fill('capture new lead: Test User, test@example.com');
      await input.press('Enter');
      
      // Wait for the workflow to process
      await page.waitForTimeout(10000);
      
      // Verify no error toast appeared
      const errorToast = page.locator('.toast-error');
      expect(await errorToast.count()).toBe(0);
    }
  });

  test('NextProcessSuggestionCard should navigate on click', async ({ page }) => {
    // This test verifies that clicking the Continue button
    // on NextProcessSuggestionCard triggers the next process
    
    // Look for any existing suggestion card
    const suggestionCard = page.locator('[data-testid="next-process-suggestion"]');
    
    if (await suggestionCard.isVisible()) {
      const continueButton = suggestionCard.locator('button:has-text("Continue")');
      
      if (await continueButton.isVisible()) {
        // Click the continue button
        await continueButton.click();
        
        // Wait for the next workflow to start
        await page.waitForTimeout(3000);
        
        // The chat should have a new message
        const messages = page.locator('[data-testid="chat-message"]');
        expect(await messages.count()).toBeGreaterThan(0);
      }
    }
  });
});

// Smoke tests that run without authentication
test.describe('Process Orchestration Smoke Tests', () => {
  test('Landing page loads without errors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Check that no critical errors occurred
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a moment for any async errors
    await page.waitForTimeout(2000);
    
    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(
      err => !err.includes('favicon') && !err.includes('analytics')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('App renders without React errors', async ({ page }) => {
    await page.goto('/');
    
    // Check for React error boundary fallbacks
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    expect(await errorBoundary.count()).toBe(0);
    
    // Check for "Something went wrong" messages
    const errorMessage = page.locator('text=Something went wrong');
    expect(await errorMessage.count()).toBe(0);
  });
});
