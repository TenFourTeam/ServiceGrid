import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeSelector } from './DateRangeSelector';
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
import { TravelWasteChart } from './TravelWasteChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, TrendingDown } from 'lucide-react';

interface RouteAnalyticsViewProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

export default function RouteAnalyticsView({ dateRange, onDateRangeChange }: RouteAnalyticsViewProps) {
  const { data, isLoading, error } = useAnalyticsSummary(dateRange.start, dateRange.end);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load route analytics: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const potentialSavings = data.overview.averageTravelTime * 0.3; // Estimate 30% could be saved

  return (
    <div className="space-y-6">
      <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Travel Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.averageTravelTime.toFixed(0)} min</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per job
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{potentialSavings.toFixed(0)} min</div>
            <p className="text-xs text-muted-foreground mt-1">
              With route optimization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In selected period
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Travel Time Analysis</CardTitle>
          <CardDescription>
            Weekly travel time trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TravelWasteChart data={data.weeklyTrends} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optimization Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Route Clustering</p>
                <p className="text-sm text-muted-foreground">
                  Group jobs in similar areas together to reduce travel time
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Time Windows</p>
                <p className="text-sm text-muted-foreground">
                  Schedule jobs during optimal traffic times to minimize delays
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
