import React from 'react';
import { useCustomersData } from '@/hooks/useCustomersData';
import { useJobsData } from '@/hooks/useJobsData';
import { useQuotesData } from '@/hooks/useQuotesData';
import { Progress } from '@/components/ui/progress';

export function GlobalLoadingIndicator() {
  const { isLoadingCount: customersLoading } = useCustomersData({ loadData: false });
  const { isLoadingCount: jobsLoading } = useJobsData({ loadData: false });
  const { isLoadingCount: quotesLoading } = useQuotesData({ loadData: false });
  
  const isLoading = customersLoading || jobsLoading || quotesLoading;

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={undefined} className="h-1 rounded-none" />
    </div>
  );
}