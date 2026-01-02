import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useVerificationMetrics } from '@/hooks/useVerificationMetrics';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VerificationMetricsPanel() {
  const { businessId } = useBusinessContext();

  const { data: metrics, isLoading } = useVerificationMetrics(businessId, {
    limit: 500,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI Verification Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI Verification Metrics
          </CardTitle>
          <CardDescription>
            Monitor AI agent tool execution verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No verification data yet. Metrics will appear once AI agent tools are executed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedToolFailures = Object.entries(metrics.failuresByTool)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          AI Verification Metrics
        </CardTitle>
        <CardDescription>
          Monitor AI agent tool execution verification health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Success Rate</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-bold",
                metrics.successRate >= 95 ? "text-green-600" :
                metrics.successRate >= 80 ? "text-yellow-600" : "text-destructive"
              )}>
                {metrics.successRate.toFixed(1)}%
              </span>
              {metrics.successRate >= 95 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Checks</p>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Passed</p>
            <p className="text-2xl font-bold text-green-600">{metrics.passed}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Failed</p>
            <p className="text-2xl font-bold text-destructive">{metrics.failed}</p>
          </div>
        </div>

        {/* Success Rate Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Verification Health</span>
            <span className="text-muted-foreground">{metrics.passed}/{metrics.total} passed</span>
          </div>
          <Progress value={metrics.successRate} className="h-2" />
        </div>

        {/* Average Execution Time */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Avg. Verification Time</p>
            <p className="text-xs text-muted-foreground">
              {metrics.avgExecutionTimeMs.toFixed(0)}ms per tool execution
            </p>
          </div>
          <div className="ml-auto">
            <Zap className={cn(
              "h-5 w-5",
              metrics.avgExecutionTimeMs < 100 ? "text-green-600" :
              metrics.avgExecutionTimeMs < 500 ? "text-yellow-600" : "text-destructive"
            )} />
          </div>
        </div>

        {/* Failures by Tool */}
        {sortedToolFailures.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Top Failing Tools</h4>
            <div className="space-y-2">
              {sortedToolFailures.map(([tool, count]) => (
                <div key={tool} className="flex items-center justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{tool}</code>
                  <Badge variant="destructive" className="text-xs">
                    {count} failures
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failures by Phase */}
        {Object.keys(metrics.failuresByPhase).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Failures by Phase</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.failuresByPhase).map(([phase, count]) => (
                <Badge key={phase} variant="outline" className="text-xs">
                  {phase}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Failures */}
        {metrics.recentFailures.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Failures</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {metrics.recentFailures.slice(0, 5).map((failure) => (
                <div
                  key={failure.id}
                  className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <code className="text-xs">{failure.tool_name}</code>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {failure.phase}
                    </Badge>
                  </div>
                  {failure.failed_assertions?.[0] && (
                    <p className="mt-1 text-xs text-muted-foreground pl-6">
                      {failure.failed_assertions[0].description}
                    </p>
                  )}
                  {failure.recovery_suggestion && (
                    <p className="mt-1 text-xs text-primary pl-6">
                      💡 {failure.recovery_suggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
