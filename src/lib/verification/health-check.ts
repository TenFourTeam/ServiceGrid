/**
 * Universal Health Check Aggregator
 * 
 * Runs all system validators and aggregates results into a unified health report.
 * This is the central orchestrator for the verification framework.
 */

import { EdgeFunctionValidator } from './edge-functions/validator';
import { DatabaseValidator } from './database/validator';
import { SecurityValidator } from './security/validator';
import { TestCoverageValidator } from './testing/validator';
import { AlignmentValidator } from './alignment';
import { 
  UniversalHealthReport, 
  SystemHealthReport, 
  HealthCheck,
  ValidatorOptions,
  SystemType,
  calculateScore,
  determineStatus
} from './types';

export type SystemKey = 'edge_function' | 'database' | 'security' | 'testing' | 'alignment';

export interface HealthCheckOptions extends ValidatorOptions {
  systems?: SystemKey[];
  verbose?: boolean;
}

/**
 * Creates a validator instance for the specified system
 */
function createValidator(system: SystemKey, options: ValidatorOptions = {}) {
  switch (system) {
    case 'edge_function':
      return new EdgeFunctionValidator(options);
    case 'database':
      return new DatabaseValidator(options);
    case 'security':
      return new SecurityValidator(options);
    case 'testing':
      return new TestCoverageValidator(options);
    case 'alignment':
      return new AlignmentValidator(options);
    default:
      throw new Error(`Unknown system: ${system}`);
  }
}

/**
 * Runs health checks across all specified systems
 */
export async function runHealthCheck(options: HealthCheckOptions = {}): Promise<UniversalHealthReport> {
  const defaultSystems: SystemKey[] = ['edge_function', 'database', 'security', 'testing', 'alignment'];
  const systemsToCheck = options.systems || defaultSystems;
  
  const systemsMap = new Map<SystemType, SystemHealthReport>();
  const allChecks: HealthCheck[] = [];
  
  // Run all validators
  for (const system of systemsToCheck) {
    try {
      const validator = createValidator(system, {
        skipChecks: options.skipChecks,
        strict: options.strict,
        dimensions: options.dimensions,
      });
      
      const report = await validator.generateReport();
      systemsMap.set(system as SystemType, report);
      allChecks.push(...report.checks);
    } catch (error) {
      // Create a failed report for this system
      const errorCheck: HealthCheck = {
        id: `${system}-error`,
        name: `${system} Validator Error`,
        system: system as SystemType,
        dimension: 'implementation',
        passed: false,
        required: true,
        severity: 'critical',
        details: error instanceof Error ? error.message : 'Unknown error',
        checkedAt: new Date(),
      };
      
      const failedReport: SystemHealthReport = {
        system: system as SystemType,
        checks: [errorCheck],
        dimensionScores: [{
          dimension: 'implementation',
          passed: 0,
          failed: 1,
          total: 1,
          score: 0,
          status: 'unhealthy',
        }],
        overallScore: 0,
        status: 'unhealthy',
        criticalIssues: [errorCheck],
        highPriorityIssues: [],
        recommendations: [`Fix ${system} validator error`],
        generatedAt: new Date(),
      };
      
      systemsMap.set(system as SystemType, failedReport);
      allChecks.push(errorCheck);
    }
  }
  
  // Calculate aggregated metrics
  const totalChecks = allChecks.length;
  const passedChecks = allChecks.filter(c => c.passed).length;
  const overallScore = calculateScore(passedChecks, totalChecks);
  
  // Identify critical and high priority issues
  const criticalIssues = allChecks.filter(c => !c.passed && c.severity === 'critical');
  const highPriorityIssues = allChecks.filter(c => !c.passed && c.severity === 'high');
  
  // Determine overall status
  const hasCritical = criticalIssues.length > 0;
  const overallStatus = determineStatus(overallScore, hasCritical);
  
  // Generate recommendations
  const recommendations = generateRecommendations(systemsMap);
  
  // Build system summary
  const systemSummary: UniversalHealthReport['systemSummary'] = [];
  for (const [systemType, report] of systemsMap) {
    systemSummary.push({
      system: systemType,
      score: report.overallScore,
      status: report.status,
      checksPassed: report.checks.filter(c => c.passed).length,
      checksFailed: report.checks.filter(c => !c.passed).length,
    });
  }
  
  return {
    timestamp: new Date(),
    systems: systemsMap,
    overallScore,
    status: overallStatus,
    criticalIssues,
    highPriorityIssues,
    recommendations,
    systemSummary,
  };
}

/**
 * Generates actionable recommendations from reports
 */
function generateRecommendations(systems: Map<SystemType, SystemHealthReport>): string[] {
  const recommendations: string[] = [];
  const seen = new Set<string>();
  
  for (const [, report] of systems) {
    // Add system-level recommendations
    for (const rec of report.recommendations) {
      if (!seen.has(rec)) {
        recommendations.push(rec);
        seen.add(rec);
      }
    }
    
    // Add recommendations for critical failures
    for (const check of report.checks) {
      if (!check.passed && check.required && check.recommendation) {
        const rec = `[${report.system}] ${check.recommendation}`;
        if (!seen.has(rec)) {
          recommendations.push(rec);
          seen.add(rec);
        }
      }
    }
  }
  
  return recommendations;
}

/**
 * Runs a quick health check and returns a simple pass/fail result
 */
export async function quickHealthCheck(systems?: SystemKey[]): Promise<{
  passed: boolean;
  score: number;
  criticalCount: number;
}> {
  const report = await runHealthCheck({ systems });
  
  return {
    passed: report.criticalIssues.length === 0 && report.overallScore >= 60,
    score: report.overallScore,
    criticalCount: report.criticalIssues.length,
  };
}

/**
 * Formats a health report for console output
 */
export function formatHealthReport(report: UniversalHealthReport, verbose = false): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('  🏥 UNIVERSAL HEALTH CHECK REPORT');
  lines.push('═'.repeat(60));
  lines.push('');
  
  // System summary table
  lines.push('System Health Summary:');
  lines.push('─'.repeat(60));
  lines.push('  System                    Score    Status');
  lines.push('─'.repeat(60));
  
  for (const summary of report.systemSummary) {
    const icon = summary.status === 'healthy' ? '✅' : 
                 summary.status === 'degraded' ? '⚠️' : '❌';
    const name = summary.system.padEnd(24);
    const score = `${summary.score}%`.padEnd(8);
    lines.push(`  ${icon} ${name} ${score} ${summary.status}`);
  }
  
  lines.push('─'.repeat(60));
  
  const overallIcon = report.status === 'healthy' ? '✅' : 
                      report.status === 'degraded' ? '⚠️' : '❌';
  lines.push(`  ${overallIcon} ${'OVERALL'.padEnd(24)} ${report.overallScore}%`.padEnd(8) + `     ${report.status}`);
  lines.push('');
  
  // Critical issues
  if (report.criticalIssues.length > 0) {
    lines.push('❌ Critical Issues:');
    lines.push('─'.repeat(60));
    for (const issue of report.criticalIssues) {
      lines.push(`  • [${issue.system}] ${issue.name}`);
      if (verbose && issue.details) {
        lines.push(`    └─ ${issue.details}`);
      }
    }
    lines.push('');
  }
  
  // High priority issues
  if (report.highPriorityIssues.length > 0 && verbose) {
    lines.push('⚠️ High Priority Issues:');
    lines.push('─'.repeat(60));
    for (const issue of report.highPriorityIssues) {
      lines.push(`  • [${issue.system}] ${issue.name}`);
      if (issue.details) {
        lines.push(`    └─ ${issue.details}`);
      }
    }
    lines.push('');
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('📋 Recommendations:');
    lines.push('─'.repeat(60));
    const maxRecs = verbose ? report.recommendations.length : Math.min(10, report.recommendations.length);
    for (let i = 0; i < maxRecs; i++) {
      lines.push(`  ${i + 1}. ${report.recommendations[i]}`);
    }
    if (!verbose && report.recommendations.length > 10) {
      lines.push(`  ... and ${report.recommendations.length - 10} more (use --verbose to see all)`);
    }
    lines.push('');
  }
  
  // Verbose: Show all checks by dimension
  if (verbose) {
    lines.push('📊 Detailed Check Results:');
    lines.push('─'.repeat(60));
    
    for (const [systemType, systemReport] of report.systems) {
      lines.push(`\n  ${systemType.toUpperCase()}`);
      
      const dimensions = ['implementation', 'configuration', 'verification', 'validation'] as const;
      for (const dim of dimensions) {
        const dimChecks = systemReport.checks.filter(c => c.dimension === dim);
        if (dimChecks.length === 0) continue;
        
        const dimScore = systemReport.dimensionScores.find(d => d.dimension === dim);
        const scoreStr = dimScore ? `${dimScore.passed}/${dimScore.total} (${dimScore.score}%)` : 'N/A';
        lines.push(`    ${dim}: ${scoreStr}`);
        
        for (const check of dimChecks) {
          const icon = check.passed ? '✓' : '✗';
          lines.push(`      ${icon} ${check.name}`);
        }
      }
    }
    lines.push('');
  }
  
  lines.push('═'.repeat(60));
  lines.push(`  Generated: ${report.timestamp.toISOString()}`);
  lines.push('═'.repeat(60));
  lines.push('');
  
  return lines.join('\n');
}
