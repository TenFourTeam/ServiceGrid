import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { queryKeys } from '@/queries/keys';
import { supabase } from '@/integrations/supabase/client';
import { PropertyVisualization, BeforeAfterPair } from '@/types/visualizations';
import { MediaItem } from './useJobMedia';

/**
 * Groups visualizations by their source media ID into before/after pairs
 */
function groupByBeforePhoto(media: PropertyVisualization[]): BeforeAfterPair[] {
  const grouped = new Map<string, PropertyVisualization[]>();
  
  // Group by source_media_id
  media.forEach(item => {
    const sourceId = item.generation_metadata?.source_media_id;
    if (sourceId) {
      if (!grouped.has(sourceId)) {
        grouped.set(sourceId, []);
      }
      grouped.get(sourceId)!.push(item);
    }
  });
  
  // Convert to BeforeAfterPair objects (will need to fetch before photos separately)
  return Array.from(grouped.entries()).map(([sourceId, variations]) => {
    // Sort variations by variation_number
    const sortedVariations = variations.sort((a, b) => 
      (a.generation_metadata?.variation_number || 0) - (b.generation_metadata?.variation_number || 0)
    );
    
    return {
      beforePhoto: { id: sourceId } as MediaItem, // Placeholder, will be populated by separate fetch
      variations: sortedVariations,
      generationId: variations[0]?.generation_metadata?.generation_id || '',
      prompt: variations[0]?.generation_metadata?.prompt || '',
      createdAt: variations[0]?.created_at || new Date().toISOString(),
    };
  });
}

/**
 * Hook to fetch all visualizations for a specific job
 * Includes real-time updates when new visualizations are generated
 */
export function useVisualizationsByJob(jobId: string | undefined) {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: queryKeys.visualizations.byJob(jobId || ''),
    queryFn: async () => {
      if (!jobId) return [];

      // Fetch all media for this job that has generation_metadata
      const { data, error } = await authApi.invoke(
        `job-media-crud?jobId=${jobId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      
      const allMedia = (data?.media || []) as MediaItem[];
      
      // Filter to only AI-generated visualizations
      const visualizations = allMedia.filter(
        (item): item is PropertyVisualization => 
          item.generation_metadata?.is_ai_generated === true &&
          item.generation_metadata?.generation_type === 'before_after_visualization'
      ) as PropertyVisualization[];
      
      // Group into before/after pairs
      return groupByBeforePhoto(visualizations);
    },
    enabled: !!jobId
  });

  // Real-time subscription for new visualizations
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`visualizations:job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sg_media',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          // Check if this is a visualization
          const newMedia = payload.new as any;
          if (newMedia.generation_metadata?.is_ai_generated) {
            // Invalidate query to refetch with new visualization
            queryClient.invalidateQueries({ 
              queryKey: queryKeys.visualizations.byJob(jobId) 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, queryClient]);

  return query;
}
