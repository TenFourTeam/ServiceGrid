import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { feedback } from '@/utils/feedback';

export interface QueuedAction {
  id: string;
  type: 'create_customer' | 'update_customer' | 'score_lead' | 'assign_lead' | 'create_request';
  payload: any;
  createdAt: Date;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  error?: string;
}

const STORAGE_KEY = 'lead-action-queue';
const MAX_RETRIES = 3;

/**
 * Local-first action queue for lead generation operations
 * Queues actions locally and syncs when online
 */
export function useLeadActionQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const syncingRef = useRef(false);
  
  // Persist queue to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  }, [queue]);
  
  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Sync queue when coming online
  useEffect(() => {
    if (isOnline && queue.some(a => a.status === 'pending')) {
      syncQueue();
    }
  }, [isOnline]);
  
  const queueAction = useCallback((action: Omit<QueuedAction, 'id' | 'createdAt' | 'status' | 'retryCount'>) => {
    const newAction: QueuedAction = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...action,
      createdAt: new Date(),
      status: 'pending',
      retryCount: 0,
    };
    
    setQueue(prev => [...prev, newAction]);
    feedback.optimisticStart();
    
    // Try to sync immediately if online
    if (isOnline) {
      setTimeout(() => syncQueue(), 100);
    }
    
    return newAction.id;
  }, [isOnline]);
  
  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !isOnline) return;
    syncingRef.current = true;
    
    const pendingActions = queue.filter(a => a.status === 'pending' && a.retryCount < MAX_RETRIES);
    
    for (const action of pendingActions) {
      // Update status to syncing
      setQueue(prev => prev.map(a => 
        a.id === action.id ? { ...a, status: 'syncing' as const } : a
      ));
      
      try {
        await executeAction(action);
        
        // Mark as synced and remove from queue
        setQueue(prev => prev.filter(a => a.id !== action.id));
        feedback.optimisticConfirm();
        
        // Invalidate relevant queries
        if (businessId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId) });
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setQueue(prev => prev.map(a => 
          a.id === action.id 
            ? { 
                ...a, 
                status: 'pending' as const, 
                retryCount: a.retryCount + 1,
                error: errorMessage 
              } 
            : a
        ));
        
        // If max retries reached, mark as failed
        if (action.retryCount + 1 >= MAX_RETRIES) {
          setQueue(prev => prev.map(a => 
            a.id === action.id ? { ...a, status: 'failed' as const } : a
          ));
          feedback.error();
        }
      }
    }
    
    syncingRef.current = false;
  }, [queue, isOnline, businessId, queryClient]);
  
  const executeAction = async (action: QueuedAction) => {
    switch (action.type) {
      case 'create_customer':
        const { error: createError } = await authApi.invoke('customers-crud', {
          method: 'POST',
          body: action.payload,
        });
        if (createError) throw createError;
        break;
        
      case 'update_customer':
        const { error: updateError } = await authApi.invoke('customers-crud', {
          method: 'PUT',
          body: action.payload,
        });
        if (updateError) throw updateError;
        break;
        
      case 'create_request':
        const { error: requestError } = await authApi.invoke('requests-crud', {
          method: 'POST',
          body: action.payload,
        });
        if (requestError) throw requestError;
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };
  
  const clearFailed = useCallback(() => {
    setQueue(prev => prev.filter(a => a.status !== 'failed'));
  }, []);
  
  const retryFailed = useCallback(() => {
    setQueue(prev => prev.map(a => 
      a.status === 'failed' ? { ...a, status: 'pending' as const, retryCount: 0 } : a
    ));
    setTimeout(() => syncQueue(), 100);
  }, [syncQueue]);
  
  const pendingCount = queue.filter(a => a.status === 'pending' || a.status === 'syncing').length;
  const failedCount = queue.filter(a => a.status === 'failed').length;
  
  return { 
    queue, 
    queueAction, 
    syncQueue,
    clearFailed,
    retryFailed,
    isOnline, 
    pendingCount,
    failedCount,
    isSyncing: syncingRef.current,
  };
}
