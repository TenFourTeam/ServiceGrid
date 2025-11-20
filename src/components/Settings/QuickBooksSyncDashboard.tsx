import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuickBooksSync} from '@/hooks/useQuickBooksSync';
import { useQuickBooksSyncLogs } from '@/hooks/useQuickBooksSyncLogs';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { useQuickBooksHealth } from '@/hooks/useQuickBooksHealth';
import { Users, FileText, DollarSign, Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function QuickBooksSyncDashboard() {
  const { sync, isLoading } = useQuickBooksSync();
  const { data: logs } = useQuickBooksSyncLogs();
  const { isConnected } = useQuickBooksConnection();
  const { health, refetch: refetchHealth } = useQuickBooksHealth();

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Dashboard</CardTitle>
          <CardDescription>Connect to QuickBooks to view sync status</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const entityStats = {
    customer: logs?.filter(l => l.sync_type === 'customer') || [],
    invoice: logs?.filter(l => l.sync_type === 'invoice') || [],
    payment: logs?.filter(l => l.sync_type === 'payment') || [],
    time_entry: logs?.filter(l => l.sync_type === 'time_entry') || [],
  };

  const getLastSync = (type: string) => {
    const lastLog = logs?.find(l => l.sync_type === type);
    return lastLog ? formatDistanceToNow(new Date(lastLog.created_at), { addSuffix: true }) : 'Never';
  };

  const getStatusIcon = (type: string) => {
    const lastLog = logs?.find(l => l.sync_type === type);
    if (!lastLog) return <Clock className="h-4 w-4 text-muted-foreground" />;
    if (lastLog.status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (lastLog.status === 'error') return <XCircle className="h-4 w-4 text-red-600" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  };

  const entities = [
    { key: 'customer', label: 'Customers', icon: Users, color: 'blue' },
    { key: 'invoice', label: 'Invoices', icon: FileText, color: 'green' },
    { key: 'payment', label: 'Payments', icon: DollarSign, color: 'purple' },
    { key: 'time_entry', label: 'Time Entries', icon: Clock, color: 'orange' },
  ];

  return (
    <div className="space-y-6">
      {/* Health Status */}
      {health && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Connection Health</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => refetchHealth()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {health.connection_status === 'healthy' && (
                <Badge variant="default" className="bg-green-500">Healthy</Badge>
              )}
              {health.connection_status === 'warning' && (
                <Badge variant="default" className="bg-yellow-500">Warning</Badge>
              )}
              {health.connection_status === 'error' && (
                <Badge variant="destructive">Error</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Success rate: {health.sync_success_rate_24h.toFixed(1)}%
              </span>
            </div>
            {health.last_error && (
              <p className="text-sm text-red-600 mt-2">{health.last_error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entity Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {entities.map(({ key, label, icon: Icon, color }) => {
          const stats = entityStats[key as keyof typeof entityStats];
          const successCount = stats.filter(l => l.status === 'success').length;
          const totalCount = stats.length;

          return (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className={`h-4 w-4 text-${color}-600`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {successCount}/{totalCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last sync: {getLastSync(key)}
                    </p>
                  </div>
                  {getStatusIcon(key)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => sync({ type: key as any, direction: 'to_qb' })}
                  disabled={isLoading}
                >
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              sync({ type: 'customer', direction: 'to_qb' });
              sync({ type: 'invoice', direction: 'to_qb' });
              sync({ type: 'payment', direction: 'to_qb' });
            }}
            disabled={isLoading}
          >
            Sync All to QuickBooks
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              sync({ type: 'customer', direction: 'from_qb' });
            }}
            disabled={isLoading}
          >
            Import Customers from QuickBooks
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
