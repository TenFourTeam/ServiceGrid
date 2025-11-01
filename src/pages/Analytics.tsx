import { lazy, Suspense, useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { subDays } from 'date-fns';

const AnalyticsDashboard = lazy(() => import('@/components/Analytics/AnalyticsDashboard'));
const TeamUtilizationView = lazy(() => import('@/components/Analytics/TeamUtilizationView'));
const RouteAnalyticsView = lazy(() => import('@/components/Analytics/RouteAnalyticsView'));
const AISuggestionsView = lazy(() => import('@/components/Analytics/AISuggestionsView'));
const PredictiveInsightsView = lazy(() => import('@/components/Analytics/PredictiveInsightsView'));

export default function AnalyticsPage() {
  const [params] = useSearchParams();
  const businessId = params.get('businessId') || undefined;
  const { t } = useLanguage();

  // Default date range: last 30 days
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <AppLayout title={t('navigation.analytics')} businessId={businessId}>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Insights into your scheduling efficiency, team utilization, and performance
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="ai">AI Performance</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Suspense fallback={<LoadingSkeleton />}>
              <AnalyticsDashboard 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Suspense fallback={<LoadingSkeleton />}>
              <TeamUtilizationView 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="routes" className="space-y-4">
            <Suspense fallback={<LoadingSkeleton />}>
              <RouteAnalyticsView 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Suspense fallback={<LoadingSkeleton />}>
              <AISuggestionsView 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <Suspense fallback={<LoadingSkeleton />}>
              <PredictiveInsightsView />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
