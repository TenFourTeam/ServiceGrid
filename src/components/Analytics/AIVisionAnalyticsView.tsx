import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, TrendingUp, Clock, Star, Zap, CheckCircle, XCircle } from 'lucide-react';
import { useAIGenerationStats, useAIGenerations } from '@/hooks/useAIGenerations';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const COLORS = {
  high: 'hsl(var(--success))',
  medium: 'hsl(var(--warning))',
  low: 'hsl(var(--destructive))',
  invoice: 'hsl(var(--primary))',
  checklist: 'hsl(var(--secondary))',
  success: 'hsl(var(--success))',
  failed: 'hsl(var(--destructive))',
};

interface AIVisionAnalyticsViewProps {
  dateRange: { start: Date; end: Date };
}

export default function AIVisionAnalyticsView({ dateRange }: AIVisionAnalyticsViewProps) {
  const [generationType, setGenerationType] = useState<'all' | 'invoice_estimate' | 'checklist_generation'>('all');

  const { data: stats, isLoading, error } = useAIGenerationStats({
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    generationType: generationType === 'all' ? undefined : generationType,
  });

  const { data: recentGenerations } = useAIGenerations({
    limit: 10,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    generationType: generationType === 'all' ? undefined : generationType,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load AI analytics: {error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!stats) return null;

  const confidenceData = [
    { name: 'High', value: stats.confidenceCounts.high, color: COLORS.high },
    { name: 'Medium', value: stats.confidenceCounts.medium, color: COLORS.medium },
    { name: 'Low', value: stats.confidenceCounts.low, color: COLORS.low },
  ];

  const typeData = [
    { name: 'Invoice Scans', value: stats.byType.invoice_estimate, color: COLORS.invoice },
    { name: 'Checklist Generation', value: stats.byType.checklist_generation, color: COLORS.checklist },
  ];

  const successData = [
    { name: 'Successful', value: stats.successful, color: COLORS.success },
    { name: 'Failed', value: stats.failed, color: COLORS.failed },
  ];

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Vision Analytics</h2>
        <Select value={generationType} onValueChange={(v: any) => setGenerationType(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="invoice_estimate">Invoice Scans</SelectItem>
            <SelectItem value="checklist_generation">Checklist Generation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.byType.invoice_estimate} invoices, {stats.byType.checklist_generation} checklists
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.successful} successful, {stats.failed} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.averageLatency / 1000).toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              Average latency per generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Credits Used</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.estimatedCredits}</div>
            <p className="text-xs text-muted-foreground">
              Estimated credits consumed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
            <CardDescription>AI confidence levels for generations</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={confidenceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation Types</CardTitle>
            <CardDescription>Distribution by AI feature</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Success vs Failures</CardTitle>
            <CardDescription>Generation outcomes</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={successData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {successData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Feedback</CardTitle>
            <CardDescription>Quality ratings from users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Generations with feedback</span>
                <Badge variant="secondary">{stats.feedbackStats.totalWithFeedback}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {stats.feedbackStats.averageRating > 0 
                      ? stats.feedbackStats.averageRating.toFixed(1)
                      : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Edited by users</span>
                <Badge variant="outline">{stats.feedbackStats.edited}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Generations */}
      {recentGenerations?.generations && recentGenerations.generations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Generations</CardTitle>
            <CardDescription>Latest AI-generated content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentGenerations.generations.map((gen) => (
                <div key={gen.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {gen.output_data ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {gen.generation_type === 'invoice_estimate' ? 'Invoice Scan' : 'Checklist Generation'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(gen.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {gen.confidence && (
                      <Badge variant={gen.confidence === 'high' ? 'default' : 'secondary'}>
                        {gen.confidence}
                      </Badge>
                    )}
                    {gen.feedback_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs">{gen.feedback_rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
