import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface OverviewScope {
  dateRange?: { start: string; end: string };
  assignees?: string[];
  tags?: string[];
  jobIds?: string[];
}

export interface SummaryRequest {
  summaryType: 'team' | 'customer';
  scope?: OverviewScope;
  tonePreset?: 'professional' | 'casual' | 'technical';
  redactionSettings: {
    excludeInternalComments: boolean;
    excludeCosts: boolean;
  };
}

export interface AIArtifact {
  id: string;
  artifact_type: 'overview' | 'team_summary' | 'customer_summary';
  title: string;
  content_markdown: string;
  content_html: string;
  metadata: any;
  provenance: any;
  created_at: string;
  input_hash: string;
}

/**
 * Generate a comprehensive project overview document
 */
export function useGenerateOverview() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scope: OverviewScope) => {
      const { data, error } = await authApi.invoke('generate-overview-doc', {
        method: 'POST',
        body: { businessId, scope },
        toast: {
          loading: 'Generating overview document...',
          success: 'Overview generated successfully!',
          error: 'Failed to generate overview'
        }
      });

      if (error) throw new Error(error.message);
      return data as AIArtifact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-artifacts', businessId] });
    }
  });
}

/**
 * Generate a filtered summary (team or customer-facing)
 */
export function useGenerateSummary() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SummaryRequest) => {
      const { data, error } = await authApi.invoke('generate-summary', {
        method: 'POST',
        body: { businessId, ...request },
        toast: {
          loading: 'Generating summary...',
          success: 'Summary generated successfully!',
          error: 'Failed to generate summary'
        }
      });

      if (error) throw new Error(error.message);
      return data as AIArtifact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-artifacts', businessId] });
    }
  });
}

/**
 * List all AI-generated artifacts for the current business
 */
export function useAIArtifacts() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['ai-artifacts', businessId],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('artifacts-list', {
        method: 'POST',
        body: { businessId }
      });

      if (error) throw new Error(error.message);
      return data.artifacts as AIArtifact[];
    },
    enabled: !!businessId
  });
}
