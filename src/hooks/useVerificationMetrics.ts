import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export interface VerificationMetric {
  id: string;
  tool_name: string;
  verification_passed: boolean;
  phase: 'precondition' | 'postcondition' | 'invariant' | 'db_assertion';
  failed_assertions: Array<{ assertionId: string; description: string; expected: any; actual: any; }>;
  execution_time_ms: number;
  recovery_suggestion?: string;
  created_at: string;
}

export interface VerificationSummary {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  avgExecutionTimeMs: number;
  failuresByTool: Record<string, number>;
  failuresByPhase: Record<string, number>;
  recentFailures: VerificationMetric[];
}

export function useVerificationMetrics(
  businessId: string | undefined,
  options?: { dateRange?: { start: Date; end: Date }; limit?: number; }
) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['verification-metrics', businessId, options?.dateRange, options?.limit],
    queryFn: async (): Promise<VerificationSummary> => {
      const defaultSummary = { total: 0, passed: 0, failed: 0, successRate: 100, avgExecutionTimeMs: 0, failuresByTool: {}, failuresByPhase: {}, recentFailures: [] };
      if (!businessId) return defaultSummary;

      const queryParams: Record<string, string> = { activityType: 'step_verification', limit: String(options?.limit || 500) };
      if (options?.dateRange) {
        queryParams.startDate = options.dateRange.start.toISOString();
        queryParams.endDate = options.dateRange.end.toISOString();
      }

      const { data, error } = await authApi.invoke('ai-activity-crud', { method: 'GET', queryParams });
      if (error) throw new Error(error.message || 'Failed to fetch metrics');

      const metrics: VerificationMetric[] = ((data || []) as any[]).map((row) => ({
        id: row.id,
        tool_name: row.metadata?.tool_name || 'unknown',
        verification_passed: row.metadata?.verification_passed || false,
        phase: row.metadata?.phase || 'precondition',
        failed_assertions: row.metadata?.failed_assertions || [],
        execution_time_ms: row.metadata?.execution_time_ms || 0,
        recovery_suggestion: row.metadata?.recovery_suggestion,
        created_at: row.created_at,
      }));

      const total = metrics.length;
      const passed = metrics.filter(m => m.verification_passed).length;
      const failed = total - passed;
      const failedMetrics = metrics.filter(m => !m.verification_passed);
      const failuresByTool: Record<string, number> = {};
      const failuresByPhase: Record<string, number> = {};
      for (const m of failedMetrics) {
        failuresByTool[m.tool_name] = (failuresByTool[m.tool_name] || 0) + 1;
        failuresByPhase[m.phase] = (failuresByPhase[m.phase] || 0) + 1;
      }

      return {
        total, passed, failed, successRate: total > 0 ? (passed / total) * 100 : 100,
        avgExecutionTimeMs: total > 0 ? metrics.reduce((s, m) => s + m.execution_time_ms, 0) / total : 0,
        failuresByTool, failuresByPhase, recentFailures: failedMetrics.slice(0, 10),
      };
    },
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

export function useVerificationHistory(businessId: string | undefined, toolName?: string, limit = 50) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['verification-history', businessId, toolName, limit],
    queryFn: async (): Promise<VerificationMetric[]> => {
      if (!businessId) return [];

      const { data, error } = await authApi.invoke('ai-activity-crud', {
        method: 'GET',
        queryParams: { activityType: 'step_verification', limit: String(limit) },
      });

      if (error) throw new Error(error.message || 'Failed to fetch history');

      return ((data || []) as any[])
        .map((row) => ({
          id: row.id,
          tool_name: row.metadata?.tool_name || 'unknown',
          verification_passed: row.metadata?.verification_passed || false,
          phase: row.metadata?.phase || 'precondition',
          failed_assertions: row.metadata?.failed_assertions || [],
          execution_time_ms: row.metadata?.execution_time_ms || 0,
          recovery_suggestion: row.metadata?.recovery_suggestion,
          created_at: row.created_at,
        }))
        .filter((m) => !toolName || m.tool_name === toolName);
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });
}
