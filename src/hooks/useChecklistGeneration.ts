import { useMutation } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export interface GeneratedChecklistTask {
  title: string;
  description?: string;
  position: number;
  category?: string;
  estimated_duration_minutes?: number;
  required_photo_count: number;
}

export interface SimilarTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_system_template: boolean;
  similarity: number;
}

export interface GeneratedChecklist {
  id: string; // Generation ID
  checklist_title: string;
  tasks: GeneratedChecklistTask[];
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
  sourceMediaId: string;
  similarTemplates?: SimilarTemplate[];
}

export function useChecklistGeneration() {
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({ mediaId, jobId }: { mediaId: string; jobId?: string }): Promise<GeneratedChecklist> => {
      const { data, error } = await authApi.invoke('generate-checklist-from-photo', {
        method: 'POST',
        body: { mediaId, jobId },
      });

      if (error) {
        if (error.status === 429 || error.errorType === 'RATE_LIMIT') {
          const rateLimitError = new Error('AI is experiencing high demand. Please try again in a moment.');
          (rateLimitError as any).errorType = 'RATE_LIMIT';
          throw rateLimitError;
        }
        if (error.status === 402 || error.errorType === 'PAYMENT_REQUIRED') {
          const paymentError = new Error('AI credits exhausted. Please add credits to continue.');
          (paymentError as any).errorType = 'PAYMENT_REQUIRED';
          throw paymentError;
        }
        throw new Error(error.message || 'Failed to generate checklist');
      }

      return {
        ...data?.checklist,
        similarTemplates: data?.similarTemplates
      } as GeneratedChecklist;
    },
  });
}
