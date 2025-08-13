import React from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Progress } from '@/components/ui/progress';

export function GlobalLoadingIndicator() {
  const { isLoading, error } = useDashboardData();

  if (!isLoading || error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={undefined} className="h-1 rounded-none" />
    </div>
  );
}