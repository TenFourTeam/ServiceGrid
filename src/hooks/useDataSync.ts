import { useEffect, useRef } from 'react';
import { useDashboardData } from './useDashboardData';
import { useStore } from '@/store/useAppStore';

/**
 * Sync dashboard data to store for immediate UI updates
 * This ensures all components use fresh data from the centralized API call
 */
export function useDataSync() {
  const { data: dashboardData } = useDashboardData();
  const store = useStore();
  const lastSyncRef = useRef<string>('');

  useEffect(() => {
    if (!dashboardData) return;

    // Create a simple sync key to avoid unnecessary updates
    const syncKey = `${dashboardData.counts.customers}-${dashboardData.counts.jobs}-${dashboardData.counts.quotes}`;
    if (lastSyncRef.current === syncKey) return;
    lastSyncRef.current = syncKey;

    // Note: Business data is already synced in AppLayout
    // This hook can be used for additional data syncing if needed
  }, [dashboardData, store]);

  return dashboardData;
}