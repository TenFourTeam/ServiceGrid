/**
 * Universal Verification Framework - Base Validator
 * 
 * Abstract base class that all system validators extend.
 * Provides the four-dimension verification pattern.
 */

import {
  SystemType,
  VerificationDimension,
  HealthCheck,
  DimensionScore,
  SystemHealthReport,
  HealthStatus,
  ValidatorOptions,
  calculateScore,
  determineStatus,
} from './types';

export abstract class BaseValidator {
  protected system: SystemType;
  protected options: ValidatorOptions;

  constructor(system: SystemType, options: ValidatorOptions = {}) {
    this.system = system;
    this.options = options;
  }

  // ============================================================================
  // Abstract Methods - Must be implemented by each validator
  // ============================================================================

  /**
   * Check that code exists and follows established patterns
   */
  abstract checkImplementation(): Promise<HealthCheck[]>;

  /**
   * Check settings, environment variables, dependencies are correct
   */
  abstract checkConfiguration(): Promise<HealthCheck[]>;

  /**
   * Check unit/integration tests pass, contracts are valid
   */
  abstract checkVerification(): Promise<HealthCheck[]>;

  /**
   * Check E2E tests pass, runtime health checks work
   */
  abstract checkValidation(): Promise<HealthCheck[]>;

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Run all health checks and generate a report
   */
  async generateReport(): Promise<SystemHealthReport> {
    const dimensionsToRun = this.options.dimensions || [
      'implementation',
      'configuration',
      'verification',
      'validation',
    ];

    const allChecks: HealthCheck[] = [];
    const dimensionScores: DimensionScore[] = [];

    // Run each dimension
    for (const dimension of dimensionsToRun) {
      const checks = await this.runDimension(dimension);
      const filteredChecks = this.filterSkippedChecks(checks);
      allChecks.push(...filteredChecks);

      const passed = filteredChecks.filter(c => c.passed).length;
      const failed = filteredChecks.filter(c => !c.passed).length;
      const total = filteredChecks.length;
      const score = calculateScore(passed, total);

      dimensionScores.push({
        dimension,
        passed,
        failed,
        total,
        score,
        status: this.getDimensionStatus(filteredChecks),
      });
    }

    // Calculate overall metrics
    const totalPassed = allChecks.filter(c => c.passed).length;
    const totalChecks = allChecks.length;
    const overallScore = calculateScore(totalPassed, totalChecks);

    const criticalIssues = allChecks.filter(
      c => !c.passed && c.severity === 'critical'
    );
    const highPriorityIssues = allChecks.filter(
      c => !c.passed && c.severity === 'high'
    );

    const status = determineStatus(overallScore, criticalIssues.length > 0);

    return {
      system: this.system,
      checks: allChecks,
      dimensionScores,
      overallScore,
      status,
      criticalIssues,
      highPriorityIssues,
      recommendations: this.generateRecommendations(allChecks),
      generatedAt: new Date(),
    };
  }

  /**
   * Run only a specific dimension
   */
  async runDimension(dimension: VerificationDimension): Promise<HealthCheck[]> {
    switch (dimension) {
      case 'implementation':
        return this.checkImplementation();
      case 'configuration':
        return this.checkConfiguration();
      case 'verification':
        return this.checkVerification();
      case 'validation':
        return this.checkValidation();
      default:
        return [];
    }
  }

  // ============================================================================
  // Protected Helper Methods
  // ============================================================================

  protected filterSkippedChecks(checks: HealthCheck[]): HealthCheck[] {
    const skipChecks = this.options.skipChecks || [];
    return checks.filter(c => !skipChecks.includes(c.id));
  }

  protected getDimensionStatus(checks: HealthCheck[]): HealthStatus {
    const hasCritical = checks.some(c => !c.passed && c.severity === 'critical');
    const failedCount = checks.filter(c => !c.passed).length;
    const total = checks.length;

    if (hasCritical) return 'unhealthy';
    if (total === 0) return 'unknown';
    
    const score = calculateScore(total - failedCount, total);
    return determineStatus(score, false);
  }

  protected generateRecommendations(checks: HealthCheck[]): string[] {
    return checks
      .filter(c => !c.passed && c.recommendation)
      .map(c => c.recommendation!)
      .filter((rec, idx, arr) => arr.indexOf(rec) === idx); // dedupe
  }

  /**
   * Helper to create a passing health check
   */
  protected pass(
    id: string,
    name: string,
    dimension: VerificationDimension,
    details?: string
  ): HealthCheck {
    return {
      id,
      system: this.system,
      dimension,
      name,
      passed: true,
      required: false,
      severity: 'info',
      details,
      checkedAt: new Date(),
    };
  }

  /**
   * Helper to create a failing health check
   */
  protected fail(
    id: string,
    name: string,
    dimension: VerificationDimension,
    severity: HealthCheck['severity'],
    details: string,
    recommendation?: string,
    resource?: string
  ): HealthCheck {
    return {
      id,
      system: this.system,
      dimension,
      name,
      passed: false,
      required: severity === 'critical',
      severity,
      details,
      recommendation,
      resource,
      checkedAt: new Date(),
    };
  }
}
