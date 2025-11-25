import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTimeBreakdownReport, type TimeBreakdownFilters, type DailyTimeEntry, type WeeklyTimeEntry } from '@/hooks/useTimeBreakdownReport';
import { Calendar, Clock, Users, Briefcase, Download, TrendingUp, BarChart3 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import { useJobsData } from '@/hooks/useJobsData';
import { getJobDisplayName } from '@/utils/jobDisplay';

export function TimeBreakdownReport() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | '30days' | 'custom'>('30days');
  const [groupBy, setGroupBy] = useState<'daily' | 'weekly'>('daily');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<string>('all');

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case '30days':
        return { startDate: subDays(now, 30), endDate: now };
      default:
        return { startDate: subDays(now, 30), endDate: now };
    }
  }, [dateRange]);

  const filters: TimeBreakdownFilters = {
    startDate,
    endDate,
    userId: selectedUserId !== 'all' ? selectedUserId : undefined,
    jobId: selectedJobId !== 'all' ? selectedJobId : undefined,
    groupBy,
  };

  const { data: report, isLoading } = useTimeBreakdownReport(filters);
  const { data: members } = useBusinessMembersData();
  const { data: jobs } = useJobsData();

  // Format time in hours and minutes
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Export to CSV
  const handleExport = () => {
    if (!report?.timeBreakdown) return;

    const headers = groupBy === 'daily'
      ? ['Date', 'User', 'Job', 'Time (min)', 'Tasks', 'Task Time (min)', 'Categories']
      : ['Week Start', 'User', 'Job', 'Time (min)', 'Tasks', 'Task Time (min)', 'Categories'];

    const rows = report.timeBreakdown.map((entry: any) => {
      const date = groupBy === 'daily' 
        ? format(new Date(entry.work_date), 'yyyy-MM-dd')
        : format(new Date(entry.week_start), 'yyyy-MM-dd');
      
      const categories = entry.task_categories || entry.all_task_categories || [];
      const categoryStr = Array.isArray(categories) ? categories.join('; ') : '';

      return [
        date,
        entry.user_name,
        entry.job_title || 'No Job',
        groupBy === 'daily' ? entry.timesheet_minutes : entry.total_timesheet_minutes,
        groupBy === 'daily' ? entry.tasks_completed : entry.total_tasks_completed,
        groupBy === 'daily' ? entry.task_minutes : entry.total_task_minutes,
        categoryStr,
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-breakdown-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Aggregate category data for charts
  const categoryStats = useMemo(() => {
    if (!report?.categoryBreakdown) return [];
    
    const categoryMap = new Map<string, { count: number; minutes: number }>();
    
    report.categoryBreakdown.forEach(cat => {
      const existing = categoryMap.get(cat.category) || { count: 0, minutes: 0 };
      categoryMap.set(cat.category, {
        count: existing.count + cat.task_count,
        minutes: existing.minutes + cat.total_minutes,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        taskCount: stats.count,
        totalMinutes: stats.minutes,
        avgMinutes: stats.minutes / stats.count,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [report?.categoryBreakdown]);

  // User comparison data
  const userStats = useMemo(() => {
    if (!report?.timeBreakdown) return [];
    
    const userMap = new Map<string, { name: string; minutes: number; tasks: number }>();
    
    report.timeBreakdown.forEach((entry: any) => {
      const existing = userMap.get(entry.user_id) || { name: entry.user_name, minutes: 0, tasks: 0 };
      const minutes = groupBy === 'daily' ? entry.timesheet_minutes : entry.total_timesheet_minutes;
      const tasks = groupBy === 'daily' ? entry.tasks_completed : entry.total_tasks_completed;
      
      userMap.set(entry.user_id, {
        name: entry.user_name,
        minutes: existing.minutes + (minutes || 0),
        tasks: existing.tasks + (tasks || 0),
      });
    });

    return Array.from(userMap.values()).sort((a, b) => b.minutes - a.minutes);
  }, [report?.timeBreakdown, groupBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Time Breakdown Report
          </CardTitle>
          <CardDescription>Detailed analysis of time spent by user, job, and task type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Group By</label>
              <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {members?.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Job</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                   {jobs?.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {getJobDisplayName(job)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <div className="text-sm text-muted-foreground ml-auto flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(report?.summary.totalTimeMinutes || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Task Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(report?.summary.totalTaskMinutes || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.summary.totalTasksCompleted || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              {report?.summary.uniqueUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jobs Worked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              {report?.summary.uniqueJobs || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="breakdown">Time Breakdown</TabsTrigger>
          <TabsTrigger value="categories">Category Analysis</TabsTrigger>
          <TabsTrigger value="users">User Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{groupBy === 'daily' ? 'Daily' : 'Weekly'} Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {report?.timeBreakdown && report.timeBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">{groupBy === 'daily' ? 'Date' : 'Week'}</th>
                        <th className="text-left py-2 px-4">User</th>
                        <th className="text-left py-2 px-4">Job</th>
                        <th className="text-right py-2 px-4">Time</th>
                        <th className="text-right py-2 px-4">Tasks</th>
                        <th className="text-left py-2 px-4">Categories</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.timeBreakdown.map((entry: any, idx: number) => {
                        const date = groupBy === 'daily' 
                          ? format(new Date(entry.work_date), 'MMM d, yyyy')
                          : format(new Date(entry.week_start), 'MMM d, yyyy');
                        const time = groupBy === 'daily' ? entry.timesheet_minutes : entry.total_timesheet_minutes;
                        const tasks = groupBy === 'daily' ? entry.tasks_completed : entry.total_tasks_completed;
                        const categories = entry.task_categories || entry.all_task_categories || [];

                        return (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4">{date}</td>
                            <td className="py-2 px-4">{entry.user_name}</td>
                            <td className="py-2 px-4 text-muted-foreground">
                              {entry.job_title || 'No Job'}
                            </td>
                            <td className="py-2 px-4 text-right font-medium">
                              {formatTime(time)}
                            </td>
                            <td className="py-2 px-4 text-right">{tasks}</td>
                            <td className="py-2 px-4 text-sm text-muted-foreground">
                              {Array.isArray(categories) && categories.length > 0 
                                ? categories.filter(Boolean).join(', ') 
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No time entries found for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Category Breakdown</CardTitle>
              <CardDescription>Time spent by task category</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryStats.length > 0 ? (
                <div className="space-y-4">
                  {categoryStats.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{cat.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(cat.totalMinutes)} · {cat.taskCount} tasks
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(100, (cat.totalMinutes / (categoryStats[0]?.totalMinutes || 1)) * 100)}%` 
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Avg: {formatTime(cat.avgMinutes)}/task
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Comparison</CardTitle>
              <CardDescription>Time logged by each team member</CardDescription>
            </CardHeader>
            <CardContent>
              {userStats.length > 0 ? (
                <div className="space-y-4">
                  {userStats.map((user, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(user.minutes)} · {user.tasks} tasks
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(100, (user.minutes / (userStats[0]?.minutes || 1)) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No user data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
