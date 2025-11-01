import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePredictiveInsights } from '@/hooks/usePredictiveInsights';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingUp, Users, MapPin, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function PredictiveInsightsView() {
  const { data, isLoading, error } = usePredictiveInsights();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load predictions: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  if (data.insufficient_data) {
    return (
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          {data.message || 'Not enough historical data for predictions. Keep scheduling jobs and check back soon!'}
        </AlertDescription>
      </Alert>
    );
  }

  const { predictions } = data;

  // Create capacity forecast visualization
  const next7Days = predictions.dailyPredictions.slice(0, 7);
  const highRiskNext7Days = predictions.highRiskDays.slice(0, 5);

  return (
    <div className="space-y-6">
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          Predictions are generated using AI based on your last 90 days of data
        </AlertDescription>
      </Alert>

      {/* Capacity Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Capacity Forecast (Next 7 Days)
          </CardTitle>
          <CardDescription>
            Predicted job volume per day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {next7Days.map((pred, idx) => {
              const date = addDays(new Date(), idx);
              const isHigh = pred.expectedJobs > 5;
              const isMedium = pred.expectedJobs >= 3;
              
              return (
                <div 
                  key={pred.date}
                  className={`p-3 rounded-lg text-center ${
                    isHigh ? 'bg-destructive/20' : 
                    isMedium ? 'bg-yellow-500/20' : 
                    'bg-green-500/20'
                  }`}
                >
                  <div className="text-xs font-medium">{format(date, 'EEE')}</div>
                  <div className="text-2xl font-bold mt-1">{pred.expectedJobs}</div>
                  <div className="text-xs text-muted-foreground mt-1">jobs</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* High Risk Days */}
      {highRiskNext7Days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              High Risk Days
            </CardTitle>
            <CardDescription>
              Days with potential overbooking or capacity issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highRiskNext7Days.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{format(new Date(risk.date), 'EEEE, MMM d')}</p>
                    <p className="text-sm text-muted-foreground">{risk.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staffing Recommendations */}
      {predictions.staffingRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staffing Recommendations
            </CardTitle>
            <CardDescription>
              AI-suggested actions to optimize team capacity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {predictions.staffingRecommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Opportunities */}
      {predictions.routeOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route Optimization Opportunities
            </CardTitle>
            <CardDescription>
              Ways to reduce travel time and improve efficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {predictions.routeOpportunities.map((opp, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">{opp}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
