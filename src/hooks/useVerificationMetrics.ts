import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VerificationMetric {
  id: string;
  tool_name: string;
  verification_passed: boolean;
  phase: 'precondition' | 'postcondition' | 'invariant' | 'db_assertion';
  failed_assertions: Array<{
    assertionId: string;
    description: string;
    expected: any;
    actual: any;
  }>;
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
  options?: {
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }
) {
  return useQuery({
    queryKey: ['verification-metrics', businessId, options?.dateRange, options?.limit],
    queryFn: async (): Promise<VerificationSummary> => {
      if (!businessId) {
        return {
          total: 0,
          passed: 0,
          failed: 0,
          successRate: 100,
          avgExecutionTimeMs: 0,
          failuresByTool: {},
          failuresByPhase: {},
          recentFailures: [],
        };
      }

      let query = supabase
        .from('ai_activity_log')
        .select('*')
        .eq('business_id', businessId)
        .eq('activity_type', 'step_verification')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 500);

      if (options?.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start.toISOString())
          .lte('created_at', options.dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useVerificationMetrics] Query error:', error);
        throw error;
      }

      const metrics: VerificationMetric[] = (data || []).map((row) => {
        const metadata = row.metadata as Record<string, any> || {};
        return {
          id: row.id,
          tool_name: metadata.tool_name || 'unknown',
          verification_passed: metadata.verification_passed || false,
          phase: metadata.phase || 'precondition',
          failed_assertions: metadata.failed_assertions || [],
          execution_time_ms: metadata.execution_time_ms || 0,
          recovery_suggestion: metadata.recovery_suggestion,
          created_at: row.created_at,
        };
      });

      const total = metrics.length;
      const passed = metrics.filter((m) => m.verification_passed).length;
      const failed = total - passed;
      const successRate = total > 0 ? (passed / total) * 100 : 100;

      const avgExecutionTimeMs =
        total > 0
          ? metrics.reduce((sum, m) => sum + m.execution_time_ms, 0) / total
          : 0;

      const failedMetrics = metrics.filter((m) => !m.verification_passed);

      const failuresByTool: Record<string, number> = {};
      const failuresByPhase: Record<string, number> = {};

      for (const metric of failedMetrics) {
        failuresByTool[metric.tool_name] = (failuresByTool[metric.tool_name] || 0) + 1;
        failuresByPhase[metric.phase] = (failuresByPhase[metric.phase] || 0) + 1;
      }

      return {
        total,
        passed,
        failed,
        successRate,
        avgExecutionTimeMs,
        failuresByTool,
        failuresByPhase,
        recentFailures: failedMetrics.slice(0, 10),
      };
    },
    enabled: !!businessId,
    staleTime: 60_000, // 1 minute
  });
}

export function useVerificationHistory(
  businessId: string | undefined,
  toolName?: string,
  limit = 50
) {
  return useQuery({
    queryKey: ['verification-history', businessId, toolName, limit],
    queryFn: async (): Promise<VerificationMetric[]> => {
      if (!businessId) return [];

      let query = supabase
        .from('ai_activity_log')
        .select('*')
        .eq('business_id', businessId)
        .eq('activity_type', 'step_verification')
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error('[useVerificationHistory] Query error:', error);
        throw error;
      }

      return (data || [])
        .map((row) => {
          const metadata = row.metadata as Record<string, any> || {};
          return {
            id: row.id,
            tool_name: metadata.tool_name || 'unknown',
            verification_passed: metadata.verification_passed || false,
            phase: metadata.phase || 'precondition',
            failed_assertions: metadata.failed_assertions || [],
            execution_time_ms: metadata.execution_time_ms || 0,
            recovery_suggestion: metadata.recovery_suggestion,
            created_at: row.created_at,
          };
        })
        .filter((m) => !toolName || m.tool_name === toolName);
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });
}
