import { describe, it, expect } from 'vitest';
import { createAPITestSetup, testEdgeFunction } from '../fixtures/apiTestSetup';

describe('Edge Function Authentication with Mock Clerk', () => {
  const setup = createAPITestSetup();

  it('should authenticate with mock JWT tokens', async () => {
    const result = await testEdgeFunction('audit-logs-crud', {
      scenario: 'businessOwnerA',
      scenarios: setup.scenarios,
      method: 'GET'
    });

    console.log('Auth test result:', { status: result.status, ok: result.ok, data: result.data });
    
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('auditLogs');
  });

  it('should handle different user scenarios', async () => {
    // Test business owner
    const ownerResult = await testEdgeFunction('business-role', {
      scenario: 'businessOwnerA',
      scenarios: setup.scenarios,
      method: 'GET'
    });

    // Test worker
    const workerResult = await testEdgeFunction('business-role', {
      scenario: 'businessWorkerA', 
      scenarios: setup.scenarios,
      method: 'GET'
    });

    expect(ownerResult.ok).toBe(true);
    expect(workerResult.ok).toBe(true);
    
    console.log('Owner result:', ownerResult.data);
    console.log('Worker result:', workerResult.data);
  });

  it('should fail with invalid tokens', async () => {
    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/audit-logs-crud', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid_token',
        'Content-Type': 'application/json',
      }
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500); // Should fail with authentication error
  });
});