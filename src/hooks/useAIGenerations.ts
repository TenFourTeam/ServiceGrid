import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { queryKeys } from '@/queries/keys';
import { toast } from 'sonner';

export interface AIGeneration {
  id: string;
  business_id: string;
  user_id: string;
  generation_type: 'invoice_estimate' | 'checklist_generation';
  source_media_id: string;
  job_id?: string;
  input_params: Record<string, any>;
  output_data: Record<string, any>;
  confidence?: 'high' | 'medium' | 'low';
  metadata: {
    model: string;
    tokensUsed?: number;
    latencyMs: number;
  };
  feedback_rating?: number;
  feedback_text?: string;
  was_edited?: boolean;
  final_version?: Record<string, any>;
  created_at: string;
  sg_media?: {
    file_type: string;
    public_url: string;
    thumbnail_url?: string;
  };
}

export interface AIGenerationStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  confidenceCounts: {
    high: number;
    medium: number;
    low: number;
  };
  averageLatency: number;
  feedbackStats: {
    totalWithFeedback: number;
    averageRating: number;
    edited: number;
  };
  byType: {
    invoice_estimate: number;
    checklist_generation: number;
  };
  estimatedCredits: number;
}

interface AIGenerationsFilters {
  page?: number;
  limit?: number;
  generationType?: 'invoice_estimate' | 'checklist_generation';
  userId?: string;
  confidence?: 'high' | 'medium' | 'low';
  startDate?: string;
  endDate?: string;
}

export function useAIGenerations(filters: AIGenerationsFilters = {}) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: queryKeys.ai.generations(businessId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());
      if (filters.generationType) params.set('generationType', filters.generationType);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.confidence) params.set('confidence', filters.confidence);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const { data, error } = await authApi.invoke(
        `ai-generations-analytics?${params.toString()}`,
        { method: 'GET' }
      );

      if (error) throw new Error(error.message);
      return data as { generations: AIGeneration[]; pagination: any };
    },
    enabled: !!businessId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAIGenerationStats(filters: Pick<AIGenerationsFilters, 'startDate' | 'endDate' | 'generationType'> = {}) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: queryKeys.ai.stats(businessId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.generationType) params.set('generationType', filters.generationType);

      const { data, error } = await authApi.invoke(
        `ai-generations-analytics/stats?${params.toString()}`,
        { method: 'GET' }
      );

      if (error) throw new Error(error.message);
      return data.stats as AIGenerationStats;
    },
    enabled: !!businessId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAIGenerationDetail(generationId: string | null) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: queryKeys.ai.generation(generationId!),
    queryFn: async () => {
      const { data, error } = await authApi.invoke(
        `ai-generations-analytics/${generationId}`,
        { method: 'GET' }
      );

      if (error) throw new Error(error.message);
      return data.generation as AIGeneration;
    },
    enabled: !!businessId && !!generationId,
  });
}

export function useAIGenerationFeedback() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async ({
      generationId,
      feedback_rating,
      feedback_text,
      was_edited,
      final_version,
    }: {
      generationId: string;
      feedback_rating?: number;
      feedback_text?: string;
      was_edited?: boolean;
      final_version?: Record<string, any>;
    }) => {
      const { data, error } = await authApi.invoke(
        `ai-generations-analytics/${generationId}`,
        {
          method: 'PATCH',
          body: { feedback_rating, feedback_text, was_edited, final_version },
        }
      );

      if (error) throw new Error(error.message);
      return data.generation as AIGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all(businessId) });
      toast.success('Feedback submitted successfully');
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    },
  });
}
