import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp,
  X 
} from 'lucide-react';
import { useGeneratedJobsFromTemplate } from '@/hooks/useGeneratedJobsFromTemplate';
import { formatCurrency } from '@/utils/money';

interface RecurringJobHistoryPanelProps {
  templateId: string;
  onClose: () => void;
  onViewJob?: (jobId: string) => void;
}

export function RecurringJobHistoryPanel({ 
  templateId, 
  onClose,
  onViewJob 
}: RecurringJobHistoryPanelProps) {
  const { data: stats, isLoading } = useGeneratedJobsFromTemplate(templateId);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Job History & Performance</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{stats.totalGenerated}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Total Generated
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Completion Rate
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue / 100)}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Revenue
            </div>
          </div>
        </div>

        {/* Completion Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Job Status Distribution</span>
            <span className="font-medium">{stats.completed}/{stats.totalGenerated} completed</span>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.scheduled} scheduled</span>
            <span>{stats.cancelled} cancelled</span>
          </div>
        </div>

        {/* Average Duration */}
        {stats.avgDurationMinutes && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Average Duration</span>
            </div>
            <Badge variant="secondary">
              {Math.floor(stats.avgDurationMinutes / 60)}h {stats.avgDurationMinutes % 60}m
            </Badge>
          </div>
        )}

        {/* Next Scheduled Job */}
        {stats.nextScheduledJob && (
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Next Scheduled Job</span>
              <Badge variant="outline">Upcoming</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(stats.nextScheduledJob.starts_at).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            {onViewJob && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => onViewJob(stats.nextScheduledJob.id)}
              >
                View on Calendar
              </Button>
            )}
          </div>
        )}

        {/* Recent Jobs */}
        {stats.recentJobs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Jobs</h4>
            <div className="space-y-2">
              {stats.recentJobs.slice(0, 3).map((job: any) => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-2 border rounded-md text-sm hover:bg-muted cursor-pointer"
                  onClick={() => onViewJob?.(job.id)}
                >
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        job.status === 'Completed' ? 'default' :
                        job.status === 'Scheduled' ? 'secondary' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {job.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(job.starts_at || job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {job.total && (
                    <span className="font-medium">{formatCurrency(job.total / 100)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalGenerated === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No jobs have been generated from this template yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
