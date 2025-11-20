import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuickBooksSyncLogs } from '@/hooks/useQuickBooksSyncLogs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function QuickBooksSyncHistory() {
  const { data: logs, isLoading } = useQuickBooksSyncLogs();

  const statusIcons = {
    success: <CheckCircle className="h-4 w-4 text-green-600" />,
    error: <XCircle className="h-4 w-4 text-red-600" />,
    partial: <AlertCircle className="h-4 w-4 text-yellow-600" />,
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading sync history...</div>;
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No sync activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50">
              {statusIcons[log.status as keyof typeof statusIcons]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {log.sync_type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {log.direction}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
                {log.records_processed > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.records_processed} processed, {log.records_failed} failed
                  </p>
                )}
                {log.error_message && (
                  <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
