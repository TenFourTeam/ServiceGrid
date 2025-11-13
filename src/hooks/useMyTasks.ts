import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

interface MyTask {
  itemId: string;
  itemTitle: string;
  itemDescription: string | null;
  requiredPhotoCount: number;
  currentPhotoCount: number;
  checklistId: string;
  checklistTitle: string;
  jobId: string;
  jobTitle: string;
  jobStartsAt: string | null;
  jobAddress: string | null;
}

/**
 * Hook to fetch tasks assigned to the current user
 */
export function useMyTasks() {
  const authApi = useAuthApi();
  
  return useQuery<MyTask[]>({
    queryKey: ['my-checklist-tasks'],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('my-checklist-tasks', {
        method: 'GET',
      });
      
      if (error) throw new Error(error.message || 'Failed to fetch tasks');
      return data.tasks || [];
    },
  });
}
