import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { 
  UniversalHealthReport, 
  SystemHealthReport, 
  HealthCheck,
  DimensionScore,
  HealthStatus,
  SystemType,
  VerificationDimension 
} from '@/lib/verification/types';
import { calculateScore, determineStatus, createHealthCheck } from '@/lib/verification/types';

// Client-side health check types
export type SystemKey = 'edge_function' | 'database' | 'security' | 'testing';

export interface UseSystemHealthOptions {
  systems?: SystemKey[];
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseSystemHealthResult {
  data: UniversalHealthReport | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

// Simulated health checks for client-side display
// In production, this would call an edge function that runs actual validators
async function runClientHealthCheck(systems: SystemKey[]): Promise<UniversalHealthReport> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const systemReports = new Map<SystemType, SystemHealthReport>();
  const allCriticalIssues: HealthCheck[] = [];
  const allHighPriorityIssues: HealthCheck[] = [];
  const allRecommendations: string[] = [];

  for (const system of systems) {
    const report = generateSystemReport(system);
    systemReports.set(system, report);
    allCriticalIssues.push(...report.criticalIssues);
    allHighPriorityIssues.push(...report.highPriorityIssues);
    allRecommendations.push(...report.recommendations);
  }

  const totalScore = systems.length > 0
    ? Math.round(
        Array.from(systemReports.values()).reduce((sum, r) => sum + r.overallScore, 0) / systems.length
      )
    : 100;

  const hasCritical = allCriticalIssues.length > 0;

  return {
    timestamp: new Date(),
    systems: systemReports,
    overallScore: totalScore,
    status: determineStatus(totalScore, hasCritical),
    criticalIssues: allCriticalIssues,
    highPriorityIssues: allHighPriorityIssues,
    recommendations: [...new Set(allRecommendations)],
    systemSummary: systems.map(system => {
      const report = systemReports.get(system)!;
      return {
        system,
        score: report.overallScore,
        status: report.status,
        checksPassed: report.checks.filter(c => c.passed).length,
        checksFailed: report.checks.filter(c => !c.passed).length,
      };
    }),
  };
}

function generateSystemReport(system: SystemKey): SystemHealthReport {
  const checks = generateChecksForSystem(system);
  const dimensions: VerificationDimension[] = ['implementation', 'configuration', 'verification', 'validation'];
  
  const dimensionScores: DimensionScore[] = dimensions.map(dimension => {
    const dimChecks = checks.filter(c => c.dimension === dimension);
    const passed = dimChecks.filter(c => c.passed).length;
    const failed = dimChecks.filter(c => !c.passed).length;
    const total = dimChecks.length;
    const score = calculateScore(passed, total);
    return {
      dimension,
      passed,
      failed,
      total,
      score,
      status: determineStatus(score, false),
    };
  });

  const totalPassed = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  const overallScore = calculateScore(totalPassed, totalChecks);
  const criticalIssues = checks.filter(c => !c.passed && c.severity === 'critical');
  const highPriorityIssues = checks.filter(c => !c.passed && c.severity === 'high');

  return {
    system,
    checks,
    dimensionScores,
    overallScore,
    status: determineStatus(overallScore, criticalIssues.length > 0),
    criticalIssues,
    highPriorityIssues,
    recommendations: generateRecommendations(checks),
    generatedAt: new Date(),
  };
}

function generateChecksForSystem(system: SystemKey): HealthCheck[] {
  const baseChecks: Record<SystemKey, Omit<HealthCheck, 'checkedAt'>[]> = {
    edge_function: [
      { id: 'ef-1', system: 'edge_function', dimension: 'implementation', name: 'Edge functions exist', passed: true, required: true, severity: 'critical' },
      { id: 'ef-2', system: 'edge_function', dimension: 'implementation', name: 'CORS headers configured', passed: true, required: true, severity: 'high' },
      { id: 'ef-3', system: 'edge_function', dimension: 'configuration', name: 'Required secrets set', passed: true, required: true, severity: 'critical' },
      { id: 'ef-4', system: 'edge_function', dimension: 'verification', name: 'Error handling present', passed: true, required: false, severity: 'medium' },
      { id: 'ef-5', system: 'edge_function', dimension: 'validation', name: 'Response format consistent', passed: true, required: false, severity: 'low' },
    ],
    database: [
      { id: 'db-1', system: 'database', dimension: 'implementation', name: 'Tables created', passed: true, required: true, severity: 'critical' },
      { id: 'db-2', system: 'database', dimension: 'configuration', name: 'RLS enabled on tables', passed: true, required: true, severity: 'critical' },
      { id: 'db-3', system: 'database', dimension: 'configuration', name: 'Triggers configured', passed: true, required: false, severity: 'medium' },
      { id: 'db-4', system: 'database', dimension: 'verification', name: 'Foreign keys valid', passed: true, required: true, severity: 'high' },
      { id: 'db-5', system: 'database', dimension: 'validation', name: 'Indexes optimized', passed: true, required: false, severity: 'low' },
    ],
    security: [
      { id: 'sec-1', system: 'security', dimension: 'implementation', name: 'Auth configured', passed: true, required: true, severity: 'critical' },
      { id: 'sec-2', system: 'security', dimension: 'configuration', name: 'RLS policies defined', passed: true, required: true, severity: 'critical' },
      { id: 'sec-3', system: 'security', dimension: 'verification', name: 'No public data exposure', passed: true, required: true, severity: 'critical' },
      { id: 'sec-4', system: 'security', dimension: 'validation', name: 'JWT verification enabled', passed: true, required: true, severity: 'high' },
    ],
    testing: [
      { id: 'test-1', system: 'testing', dimension: 'implementation', name: 'Test files exist', passed: true, required: false, severity: 'medium' },
      { id: 'test-2', system: 'testing', dimension: 'configuration', name: 'Test config valid', passed: true, required: false, severity: 'low' },
      { id: 'test-3', system: 'testing', dimension: 'verification', name: 'Coverage threshold met', passed: true, required: false, severity: 'medium' },
      { id: 'test-4', system: 'testing', dimension: 'validation', name: 'E2E tests passing', passed: true, required: false, severity: 'high' },
    ],
  };

  return baseChecks[system].map(check => createHealthCheck(check));
}

function generateRecommendations(checks: HealthCheck[]): string[] {
  return checks
    .filter(c => !c.passed && c.recommendation)
    .map(c => c.recommendation!)
    .slice(0, 5);
}

export function useSystemHealth(options: UseSystemHealthOptions = {}): UseSystemHealthResult {
  const {
    systems = ['edge_function', 'database', 'security', 'testing'],
    enabled = true,
    refetchInterval,
  } = options;

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const query = useQuery({
    queryKey: ['system-health', systems],
    queryFn: async () => {
      const result = await runClientHealthCheck(systems);
      setLastUpdated(new Date());
      return result;
    },
    enabled,
    refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const refetch = useCallback(() => {
    query.refetch();
  }, [query]);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error as Error | null,
    refetch,
    lastUpdated,
  };
}
