import React from 'react';
import { useCustomersCount } from '@/hooks/useCustomersCount';
import { useJobsCount } from '@/hooks/useJobsCount';
import { useQuotesCount } from '@/hooks/useQuotesCount';
import { Progress } from '@/components/ui/progress';

export function GlobalLoadingIndicator() {
  const { isLoading: customersLoading } = useCustomersCount();
  const { isLoading: jobsLoading } = useJobsCount();
  const { isLoading: quotesLoading } = useQuotesCount();
  
  const isLoading = customersLoading || jobsLoading || quotesLoading;

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={undefined} className="h-1 rounded-none" />
    </div>
  );
}