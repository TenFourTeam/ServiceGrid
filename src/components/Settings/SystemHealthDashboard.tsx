import { RefreshCw, Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { SystemHealthCard } from './SystemHealthCard';
import { CriticalIssuesBanner } from './CriticalIssuesBanner';
import { DimensionBreakdown } from './DimensionBreakdown';
import type { HealthStatus } from '@/lib/verification/types';

const statusConfig: Record<HealthStatus, { icon: React.ElementType; color: string; label: string }> = {
  healthy: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', label: 'Degraded' },
  unhealthy: { icon: XCircle, color: 'text-destructive', label: 'Unhealthy' },
  unknown: { icon: AlertTriangle, color: 'text-muted-foreground', label: 'Unknown' },
};

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

export function SystemHealthDashboard() {
  const { data, isLoading, isRefetching, refetch, lastUpdated } = useSystemHealth();

  if (isLoading) {
    return <SystemHealthSkeleton />;
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Unable to load health data</p>
        <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  const StatusIcon = statusConfig[data.status].icon;

  // Aggregate dimension scores across all systems
  const aggregatedDimensions = data.systemSummary.length > 0 
    ? Array.from(data.systems.values())
        .flatMap(s => s.dimensionScores)
        .reduce((acc, dim) => {
          const existing = acc.find(d => d.dimension === dim.dimension);
          if (existing) {
            existing.passed += dim.passed;
            existing.failed += dim.failed;
            existing.total += dim.total;
          } else {
            acc.push({ ...dim });
          }
          return acc;
        }, [] as import('@/lib/verification/types').DimensionScore[])
        .map(dim => ({
          ...dim,
          score: dim.total > 0 ? Math.round((dim.passed / dim.total) * 100) : 100,
        }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            'flex items-center justify-center w-16 h-16 rounded-full',
            data.status === 'healthy' && 'bg-green-500/10',
            data.status === 'degraded' && 'bg-amber-500/10',
            data.status === 'unhealthy' && 'bg-destructive/10',
            data.status === 'unknown' && 'bg-muted'
          )}>
            <span className={cn('text-2xl font-bold', getScoreColor(data.overallScore))}>
              {data.overallScore}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <StatusIcon className={cn('h-5 w-5', statusConfig[data.status].color)} />
              <span className={cn('font-semibold', statusConfig[data.status].color)}>
                {statusConfig[data.status].label}
              </span>
            </div>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refetch}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Critical Issues */}
      <CriticalIssuesBanner issues={data.criticalIssues} />

      {/* System Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.systemSummary.map((sys) => (
          <SystemHealthCard
            key={sys.system}
            system={sys.system}
            score={sys.score}
            status={sys.status}
            checksPassed={sys.checksPassed}
            checksFailed={sys.checksFailed}
          />
        ))}
      </div>

      {/* Dimension Breakdown */}
      {aggregatedDimensions.length > 0 && (
        <DimensionBreakdown dimensions={aggregatedDimensions} />
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {data.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SystemHealthSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div>
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
