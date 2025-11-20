import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuickBooksHealth } from '@/hooks/useQuickBooksHealth';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { Activity, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function QuickBooksHealthDashboard() {
  const { health, isLoading } = useQuickBooksHealth();
  const { status } = useQuickBooksConnection();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading health metrics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No health data available</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (health.connection_status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (health.connection_status) {
      case 'healthy':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Real-time monitoring of QuickBooks integration health
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">
                {health.connection_status.charAt(0).toUpperCase() + health.connection_status.slice(1)}
              </span>
            </div>
            {getStatusBadge()}
          </div>

          {health.last_error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              <strong>Error:</strong> {health.last_error}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Last heartbeat: {formatDistanceToNow(new Date(health.last_heartbeat), { addSuffix: true })}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Token Expiry */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Token Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{health.token_expires_in_hours}h</span>
                {health.token_expires_in_hours < 24 && (
                  <Badge variant="outline" className="text-yellow-600">
                    Expiring Soon
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Token expires in {health.token_expires_in_hours} hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sync Success Rate (24h) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">24h Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {health.sync_success_rate_24h.toFixed(1)}%
              </div>
              <Progress value={health.sync_success_rate_24h} />
              <p className="text-xs text-muted-foreground">
                {health.sync_success_rate_24h >= 95 ? 'Excellent' : 
                 health.sync_success_rate_24h >= 80 ? 'Good' : 'Needs attention'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sync Success Rate (7d) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">7-Day Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {health.sync_success_rate_7d.toFixed(1)}%
              </div>
              <Progress value={health.sync_success_rate_7d} />
            </div>
          </CardContent>
        </Card>

        {/* Average Sync Duration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg. Sync Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {health.average_sync_duration_seconds.toFixed(1)}s
              </div>
              <p className="text-xs text-muted-foreground">
                Average time per sync operation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Conflicts */}
      {health.pending_conflicts > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Pending Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              You have <strong>{health.pending_conflicts}</strong> unresolved sync conflict{health.pending_conflicts !== 1 ? 's' : ''}.
              Visit the Conflicts tab to resolve them.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connection Details */}
      {status && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Connection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Realm ID:</span>
              <span className="font-mono">{status.realmId || 'N/A'}</span>
            </div>
            {status.lastSyncAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Sync:</span>
                <span>{formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
