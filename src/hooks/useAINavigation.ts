import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface NavigationResult {
  url: string;
  entityType?: string;
  entityName?: string;
  entityId?: string;
}

export function useAINavigation() {
  const navigate = useNavigate();

  const handleNavigationResult = useCallback((result: NavigationResult) => {
    const { url, entityType, entityName } = result;
    
    if (!url) {
      console.error('Navigation result missing URL:', result);
      return;
    }

    // Show toast with entity name if available
    const displayName = entityName || entityType || 'page';
    toast.info(`Opening ${displayName}...`, {
      icon: '🔗',
      duration: 2000,
    });

    // Navigate after a short delay to let the toast show
    setTimeout(() => {
      navigate(url);
    }, 300);
  }, [navigate]);

  const handleCalendarNavigation = useCallback((result: { date?: string; view?: string }) => {
    const { date, view } = result;
    
    let url = '/calendar';
    const params = new URLSearchParams();
    
    if (date) {
      params.set('date', date);
    }
    if (view) {
      params.set('view', view);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    toast.info(`Opening calendar${date ? ` for ${new Date(date).toLocaleDateString()}` : ''}...`, {
      icon: '📅',
      duration: 2000,
    });

    setTimeout(() => {
      navigate(url);
    }, 300);
  }, [navigate]);

  return {
    handleNavigationResult,
    handleCalendarNavigation,
  };
}
