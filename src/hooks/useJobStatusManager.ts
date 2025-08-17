import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useJobsData } from '@/hooks/useJobsData';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { queryKeys } from '@/queries/keys';
import { toast } from 'sonner';
import { Job } from '@/types';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

interface JobStatusUpdate {
  id: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  startsAt?: string;
  endsAt?: string;
}

/**
 * Hook that manages automatic job status transitions based on time
 */
export function useJobStatusManager() {
  const { data: jobs, refetch } = useJobsData();
  const { businessId, isAuthenticated } = useBusinessContext();
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(getToken);
  const queryClient = useQueryClient();

  // Check which jobs need status updates
  const getJobsRequiringStatusUpdate = useCallback((jobs: Job[], currentTime: Date): JobStatusUpdate[] => {
    const updates: JobStatusUpdate[] = [];
    
    // Find jobs that should be "In Progress"
    const shouldBeInProgress = jobs.filter(job => 
      job.status === 'Scheduled' &&
      job.startsAt &&
      new Date(job.startsAt) <= currentTime &&
      job.endsAt &&
      new Date(job.endsAt) > currentTime
    );

    // Find jobs that should be completed (past "In Progress" jobs)
    const shouldBeCompleted = jobs.filter(job =>
      job.status === 'In Progress' &&
      job.endsAt &&
      new Date(job.endsAt) <= currentTime
    );

    // Only allow one job to be "In Progress" at a time
    // Sort by start time and take the most recent one
    if (shouldBeInProgress.length > 0) {
      const mostRecent = shouldBeInProgress.sort((a, b) => 
        new Date(b.startsAt!).getTime() - new Date(a.startsAt!).getTime()
      )[0];
      
      updates.push({
        id: mostRecent.id,
        status: 'In Progress'
      });

      // Any other "In Progress" jobs should be forced to completed
      const otherInProgress = jobs.filter(job => 
        job.status === 'In Progress' && 
        job.id !== mostRecent.id
      );
      
      otherInProgress.forEach(job => {
        updates.push({
          id: job.id,
          status: 'Completed',
          endsAt: new Date().toISOString()
        });
      });
    }

    // Auto-complete past "In Progress" jobs
    shouldBeCompleted.forEach(job => {
      updates.push({
        id: job.id,
        status: 'Completed',
        endsAt: job.endsAt // Keep original end time
      });
    });

    return updates;
  }, []);

  // Apply status updates to the database
  const applyStatusUpdates = useCallback(async (updates: JobStatusUpdate[]) => {
    if (updates.length === 0) return;

    try {
      // Use batch update for better performance and atomicity
      const { error } = await authApi.invoke('jobs-status-batch', {
        method: 'POST',
        body: { updates }
      });

      if (error) {
        throw new Error(error.message || 'Failed to update job statuses');
      }

      // Update the cache immediately for responsive UI
      const queryKey = queryKeys.data.jobs(businessId || '');
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          jobs: old.jobs.map((job: Job) => {
            const update = updates.find(u => u.id === job.id);
            if (update) {
              return {
                ...job,
                status: update.status,
                ...(update.startsAt && { startsAt: update.startsAt }),
                ...(update.endsAt && { endsAt: update.endsAt })
              };
            }
            return job;
          })
        };
      });

      // Show notifications for automatic changes
      const inProgressUpdates = updates.filter(u => u.status === 'In Progress');
      const completedUpdates = updates.filter(u => u.status === 'Completed');

      if (inProgressUpdates.length > 0) {
        const job = jobs.find(j => j.id === inProgressUpdates[0].id);
        toast.success(`Job "${job?.title || 'Untitled'}" is now in progress`);
      }

      if (completedUpdates.length > 0) {
        const completedTitles = completedUpdates.map(u => {
          const job = jobs.find(j => j.id === u.id);
          return job?.title || 'Untitled';
        });
        toast.info(`Auto-completed: ${completedTitles.join(', ')}`);
      }

      // Refetch to ensure data consistency
      await refetch();

    } catch (error) {
      console.error('Failed to apply job status updates:', error);
      toast.error('Failed to update job statuses automatically');
    }
  }, [businessId, queryClient, jobs, refetch]);

  // Monitor and update job statuses
  const checkAndUpdateJobStatuses = useCallback(async () => {
    if (!isAuthenticated || !jobs.length) return;

    const currentTime = new Date();
    const updates = getJobsRequiringStatusUpdate(jobs, currentTime);
    
    if (updates.length > 0) {
      console.log('[JobStatusManager] Applying automatic status updates:', updates);
      await applyStatusUpdates(updates);
    }
  }, [isAuthenticated, jobs, getJobsRequiringStatusUpdate, applyStatusUpdates]);

  // Set up automatic monitoring
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial check
    checkAndUpdateJobStatuses();

    // Check every minute for status updates
    const interval = setInterval(checkAndUpdateJobStatuses, 60_000);

    return () => clearInterval(interval);
  }, [checkAndUpdateJobStatuses, isAuthenticated]);

  return {
    checkAndUpdateJobStatuses,
    getJobsRequiringStatusUpdate
  };
}