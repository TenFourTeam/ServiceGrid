import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssessmentProgress {
  checklistProgress: number; // 0-100 percentage
  totalChecklistItems: number;
  completedChecklistItems: number;
  photoCount: number;
  beforePhotoCount: number;
  risksFound: number;
  opportunitiesFound: number;
  hasReport: boolean;
}

/**
 * Hook to fetch assessment progress for a job
 */
export function useAssessmentProgress(jobId: string | undefined) {
  return useQuery({
    queryKey: ['assessment-progress', jobId],
    queryFn: async (): Promise<AssessmentProgress> => {
      if (!jobId) {
        return {
          checklistProgress: 0,
          totalChecklistItems: 0,
          completedChecklistItems: 0,
          photoCount: 0,
          beforePhotoCount: 0,
          risksFound: 0,
          opportunitiesFound: 0,
          hasReport: false,
        };
      }

      // Fetch checklist progress
      const { data: checklists } = await supabase
        .from('sg_checklists')
        .select('id')
        .eq('job_id', jobId);

      let totalItems = 0;
      let completedItems = 0;

      if (checklists && checklists.length > 0) {
        const checklistIds = checklists.map(c => c.id);
        
        const { data: items } = await supabase
          .from('sg_checklist_items')
          .select('id, is_completed')
          .in('checklist_id', checklistIds);

        if (items) {
          totalItems = items.length;
          completedItems = items.filter(i => i.is_completed).length;
        }
      }

      // Fetch media with tags
      const { data: media } = await supabase
        .from('sg_media')
        .select('id, tags')
        .eq('job_id', jobId)
        .eq('file_type', 'photo');

      const photoCount = media?.length || 0;
      let beforePhotoCount = 0;
      let risksFound = 0;
      let opportunitiesFound = 0;

      if (media) {
        media.forEach(m => {
          const tags = m.tags as string[] | null;
          if (tags) {
            if (tags.some(t => t === 'assessment:before')) {
              beforePhotoCount++;
            }
            risksFound += tags.filter(t => t.startsWith('risk:')).length;
            opportunitiesFound += tags.filter(t => t.startsWith('opportunity:')).length;
          }
        });
      }

      // Check for AI summary/report - use metadata->job_id to find artifacts for this job
      // Using a simpler approach to avoid TypeScript deep instantiation issues
      let hasReport = false;
      try {
        const { data: artifacts } = await supabase
          .from('sg_ai_artifacts')
          .select('id, metadata')
          .eq('artifact_type', 'summary')
          .limit(100);
        
        if (artifacts) {
          hasReport = artifacts.some(a => {
            const meta = a.metadata as Record<string, unknown> | null;
            return meta?.job_id === jobId;
          });
        }
      } catch (e) {
        console.error('[useAssessmentProgress] Error checking for report:', e);
      }

      const checklistProgress = totalItems > 0 
        ? Math.round((completedItems / totalItems) * 100) 
        : 0;

      return {
        checklistProgress,
        totalChecklistItems: totalItems,
        completedChecklistItems: completedItems,
        photoCount,
        beforePhotoCount,
        risksFound,
        opportunitiesFound,
        hasReport,
      };
    },
    enabled: !!jobId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch assessment job linked to a request
 */
export function useRequestAssessmentJob(requestId: string | undefined) {
  return useQuery({
    queryKey: ['request-assessment-job', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      const { data, error } = await supabase
        .from('jobs')
        .select('id, status, is_assessment, starts_at, ends_at')
        .eq('request_id', requestId)
        .eq('is_assessment', true)
        .maybeSingle();

      if (error) {
        console.error('[useRequestAssessmentJob] Error:', error);
        return null;
      }

      return data;
    },
    enabled: !!requestId,
    staleTime: 30000,
  });
}
