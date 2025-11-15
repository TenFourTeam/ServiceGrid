import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import type { PageCollaborator } from './usePages';

export function usePagePresence(pageId: string | undefined) {
  const authApi = useAuthApi();
  const { businessId, profileId } = useBusinessContext();
  const [collaborators, setCollaborators] = useState<PageCollaborator[]>([]);

  const updatePresence = async (cursorPosition?: any, isViewing = true) => {
    if (!pageId || !businessId) return;

    await authApi.invoke('page-presence', {
      method: 'POST',
      queryParams: { pageId },
      body: JSON.stringify({ cursorPosition, isViewing }),
    });
  };

  useEffect(() => {
    if (!pageId) return;

    const channel = supabase
      .channel(`page-presence:${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sg_page_collaborators',
          filter: `page_id=eq.${pageId}`,
        },
        async () => {
          const { data } = await authApi.invoke('page-presence', {
            method: 'GET',
            queryParams: { pageId },
          });

          if (data?.collaborators) {
            setCollaborators(data.collaborators);
          }
        }
      )
      .subscribe();

    updatePresence(null, true);

    const interval = setInterval(() => {
      updatePresence(null, true);
    }, 30000);

    return () => {
      updatePresence(null, false);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [pageId, businessId]);

  return {
    collaborators: collaborators.filter(c => c.user_id !== profileId),
    updatePresence,
  };
}