import { useState } from 'react';
import { Clock, TrendingUp, Users, Briefcase, CheckSquare, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTimeTrackingAnalytics } from '@/hooks/useTimeTrackingAnalytics';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import { format } from 'date-fns';
import { TimeBreakdownReport } from './TimeBreakdownReport';

export function TimeTrackingTab() {
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>('summary');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const { data: summaryData, isLoading: summaryLoading } = useTimeTrackingAnalytics('summary');
  const { data: jobReport, isLoading: jobLoading } = useTimeTrackingAnalytics('time-by-job');
  const { data: taskReport, isLoading: taskLoading } = useTimeTrackingAnalytics(
    'time-by-task',
    selectedUserId === 'all' ? undefined : selectedUserId
  );
  const { data: productivityReport, isLoading: productivityLoading } = useTimeTrackingAnalytics(
    'user-productivity',
    selectedUserId === 'all' ? undefined : selectedUserId
  );
  const { data: membersData } = useBusinessMembersData();

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (summaryLoading) {
    return <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>;
  }

  const summary = summaryData?.summary;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'summary' | 'detailed')}>
        <TabsList>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Detailed Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Job Time</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutes(summary?.totalJobTime || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Task Time</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutes(summary?.totalTaskTime || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalJobs || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalTasksCompleted || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.activeWorkers || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Tracking Reports
            </CardTitle>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {membersData?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList>
              <TabsTrigger value="jobs">By Job</TabsTrigger>
              <TabsTrigger value="tasks">By Task</TabsTrigger>
              <TabsTrigger value="productivity">User Productivity</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4">
              {jobLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-2">
                  {jobReport?.report?.map((job: any) => (
                    <div key={job.job_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{job.job_title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.unique_workers} worker(s) · {job.total_entries} entries
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {formatMinutes(job.total_minutes || 0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              {taskLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-2">
                  {taskReport?.report?.map((task: any) => (
                    <div key={task.item_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{task.item_title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {task.job_title} · {task.checklist_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Completed by {task.completed_by_name} on {format(new Date(task.completed_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {formatMinutes(task.time_spent_minutes || 0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="productivity" className="space-y-4">
              {productivityLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-2">
                  {productivityReport?.report?.map((user: any) => (
                    <div key={user.user_id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{user.full_name}</h4>
                        <Badge variant="outline" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {user.tasks_per_hour} tasks/hr
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tasks Completed</p>
                          <p className="font-medium">{user.tasks_completed}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Task Time</p>
                          <p className="font-medium">{formatMinutes(user.task_minutes || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Timesheet Time</p>
                          <p className="font-medium">{formatMinutes(user.timesheet_minutes || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <TimeBreakdownReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
