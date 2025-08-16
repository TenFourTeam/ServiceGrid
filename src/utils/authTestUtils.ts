/**
 * Authentication testing and verification utilities
 * Use in development to verify auth flow works correctly
 */

import { authMonitor } from './authMonitor';
import { edgeRequest } from './edgeApi';
import { fn } from './functionUrl';

export interface AuthTestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
  duration?: number;
}

class AuthTester {
  private results: AuthTestResult[] = [];

  async runTest(testName: string, testFn: () => Promise<any>): Promise<AuthTestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const testResult: AuthTestResult = {
        test: testName,
        passed: true,
        details: result,
        duration: Date.now() - startTime,
      };
      
      this.results.push(testResult);
      console.info(`✅ [AuthTest] ${testName} - PASSED (${testResult.duration}ms)`);
      return testResult;
    } catch (error) {
      const testResult: AuthTestResult = {
        test: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
      
      this.results.push(testResult);
      console.error(`❌ [AuthTest] ${testName} - FAILED (${testResult.duration}ms):`, error);
      return testResult;
    }
  }

  async runFullAuthTest(): Promise<AuthTestResult[]> {
    console.info('🧪 [AuthTester] Starting comprehensive authentication test...');
    
    this.results = [];
    
    // Test 1: Token availability
    await this.runTest('Token Availability', async () => {
      const token = await window.Clerk?.session?.getToken();
      if (!token) throw new Error('No token available');
      return { tokenLength: token.length, tokenPrefix: token.substring(0, 20) };
    });

    // Test 2: Edge function authentication
    await this.runTest('Edge Function Auth', async () => {
      return await edgeRequest(fn('business-role?business_id=test'));
    });

    // Test 3: Business context
    await this.runTest('Business Context', async () => {
      return await edgeRequest(fn('business-update'), {
        method: 'POST',
        body: JSON.stringify({ businessName: 'Test Business' }),
      });
    });

    // Test 4: Token refresh
    await this.runTest('Token Refresh', async () => {
      const token1 = await window.Clerk?.session?.getToken();
      const token2 = await window.Clerk?.session?.getToken({ refresh: true });
      
      return {
        tokensMatch: token1 === token2,
        token1Length: token1?.length,
        token2Length: token2?.length,
      };
    });

    // Test 5: Auth monitoring
    await this.runTest('Auth Monitoring', async () => {
      const metrics = authMonitor.getHealthMetrics();
      const recentEvents = authMonitor.getRecentEvents(5);
      
      return {
        healthMetrics: metrics,
        recentEventCount: recentEvents.length,
        hasErrors: metrics.errorRate > 0,
      };
    });

    console.info('🏁 [AuthTester] Test suite completed');
    return this.results;
  }

  getResults(): AuthTestResult[] {
    return [...this.results];
  }

  getPassingTests(): AuthTestResult[] {
    return this.results.filter(r => r.passed);
  }

  getFailingTests(): AuthTestResult[] {
    return this.results.filter(r => !r.passed);
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.getPassingTests().length;
    const failed = this.getFailingTests().length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    
    return {
      total,
      passed,
      failed,
      passRate: Math.round(passRate * 100) / 100,
      avgDuration: total > 0 
        ? Math.round((this.results.reduce((sum, r) => sum + (r.duration || 0), 0) / total) * 100) / 100
        : 0,
    };
  }

  clear() {
    this.results = [];
  }
}

export const authTester = new AuthTester();

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  (window as any).authTester = authTester;
  (window as any).runAuthTest = () => authTester.runFullAuthTest();
  
  console.info('🔧 [AuthTester] Development utilities available:');
  console.info('  • window.authTester - Full auth testing interface');
  console.info('  • window.runAuthTest() - Run comprehensive auth test');
  console.info('  • window.authMonitor - Auth event monitoring');
}