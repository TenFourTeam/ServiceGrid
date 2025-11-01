import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeamUtilization } from '@/hooks/useTeamUtilization';
import { DateRangeSelector } from './DateRangeSelector';
import { TeamUtilizationChart } from './TeamUtilizationChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamUtilizationViewProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

export default function TeamUtilizationView({ dateRange, onDateRangeChange }: TeamUtilizationViewProps) {
  const { data, isLoading, error } = useTeamUtilization(dateRange.start, dateRange.end);

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
          Failed to load team utilization: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <div className="space-y-4">
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No team members found for this period
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />

      <Card>
        <CardHeader>
          <CardTitle>Team Utilization Rates</CardTitle>
          <CardDescription>
            Hours worked vs available per team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamUtilizationChart data={data.members} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.hoursWorked}h worked / {member.hoursAvailable}h available
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{member.utilizationRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">
                    {member.jobsCompleted} jobs completed
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
