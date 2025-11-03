import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
import { DateRangeSelector } from './DateRangeSelector';
import { EfficiencyTrendChart } from './EfficiencyTrendChart';
import { TrendingUp, Clock, Target, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsDashboardProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

export default function AnalyticsDashboard({ dateRange, onDateRangeChange }: AnalyticsDashboardProps) {
  const { data, isLoading, error } = useAnalyticsSummary(dateRange.start, dateRange.end);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load analytics: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const { overview, weeklyTrends } = data;

  return (
    <div className="space-y-6">
      <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-2xl font-bold">{overview.efficiencyScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall scheduling efficiency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-2xl font-bold">{overview.onTimeCompletionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.completedJobs} of {overview.totalJobs} jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-sm font-medium">Avg Travel Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-2xl font-bold">{overview.averageTravelTime.toFixed(0)} min</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per job
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-2xl font-bold">{overview.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In selected period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Efficiency Trends</CardTitle>
          <CardDescription>
            Weekly performance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EfficiencyTrendChart data={weeklyTrends} />
        </CardContent>
      </Card>
    </div>
  );
}
