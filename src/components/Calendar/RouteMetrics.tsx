import { Car, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Job } from '@/types';

interface RouteMetricsProps {
  jobs: Job[];
  totalTravelTimeMinutes: number;
}

/**
 * Displays route efficiency metrics for a day
 * Shows drive time, service time, and efficiency score
 */
export function RouteMetrics({ jobs, totalTravelTimeMinutes }: RouteMetricsProps) {
  const totalServiceMinutes = jobs.reduce((sum, job) => {
    if (!job.startsAt || !job.endsAt) return sum;
    const start = new Date(job.startsAt);
    const end = new Date(job.endsAt);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60);
  }, 0);

  const totalMinutes = totalServiceMinutes + totalTravelTimeMinutes;
  const efficiencyScore = totalMinutes > 0 
    ? Math.round((totalServiceMinutes / totalMinutes) * 100)
    : 0;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Drive Time</span>
          </div>
          <p className="text-2xl font-bold">
            {formatTime(totalTravelTimeMinutes)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Service Time</span>
          </div>
          <p className="text-2xl font-bold">
            {formatTime(totalServiceMinutes)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Efficiency</span>
          </div>
          <p className="text-2xl font-bold">{efficiencyScore}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {efficiencyScore >= 80 ? '🟢 Excellent' : efficiencyScore >= 60 ? '🟡 Good' : '🔴 Could improve'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
